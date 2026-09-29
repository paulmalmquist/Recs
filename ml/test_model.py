import copy
import json
import tempfile
import unittest
from pathlib import Path
import numpy as np
from .model import fit, matrix, validate, timestamp, recommend, save_model, load_model


class ModelingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(Path('ml/demo/input.json').read_text())

    def test_fit_learns_and_converges(self):
        r = np.array([[8, 4, 0], [6, 7, 0], [0, 0, 9]], dtype=float)
        x, y, loss = fit(r, factors=2)
        self.assertLess(loss[-1], loss[0])
        self.assertTrue(all(b <= a + 1e-8 for a, b in zip(loss, loss[1:])))
        self.assertGreater((x@y.T)[0, 0], (x@y.T)[0, 2])
        np.testing.assert_allclose(x, fit(r, factors=2)[0])

    def test_future_and_impressions_cannot_change_training(self):
        data = self.data
        events = validate(data)
        cutoff = timestamp(data['train_end'])
        before = matrix(data, events, cutoff)
        extra = dict(events[0], event_type='impression')
        future = dict(events[0], created_at=data['test_end'])
        np.testing.assert_array_equal(before, matrix(data, events+[extra, future], cutoff))

    def test_dedup_and_conflict(self):
        data = copy.deepcopy(self.data)
        count = len(validate(data))
        data['events'].append(copy.deepcopy(data['events'][0]))
        self.assertEqual(len(validate(data)), count)
        data['events'][-1]['event_type'] = 'impression'
        with self.assertRaises(ValueError):
            validate(data)

    def test_timezone_required(self):
        with self.assertRaises(ValueError):
            timestamp('2026-01-01T00:00:00')

    def test_invalid_fit(self):
        with self.assertRaises(ValueError):
            fit(np.array([[float('nan')]]))

    def test_serving_permissions_coldstart_and_integrity(self):
        models = list(Path('ml/artifacts').glob('*/model.json'))
        self.assertEqual(len(models), 1)
        model = load_model(models[0])
        user = dict(self.data['users'][0], id='unseen-person')
        apps = self.data['apps']
        allowed = [a['id'] for a in apps]
        with self.assertRaises(ValueError):
            recommend(model, user, apps, allowed)
        rows = recommend(model, user, apps, allowed, ['build-overview'], production=False)
        self.assertTrue(rows)
        self.assertTrue(all(r['source'] == 'rules-fallback' for r in rows))
        self.assertNotIn('legacy-tracker', [r['app_id'] for r in rows])
        self.assertNotIn('build-overview', [r['app_id'] for r in rows])
        self.assertEqual(recommend(model, user, apps, [], production=False), [])
        warm = recommend(model, self.data['users'][0], apps, allowed, production=False)
        self.assertEqual(warm[0]['source'], 'als')
        quality = dict(self.data['users'][0], role='quality')
        rows = recommend(model, quality, apps, allowed, production=False)
        self.assertNotIn('pipeline-observer', [r['app_id'] for r in rows])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'model.json'
            save_model(path, model)
            self.assertEqual(load_model(path)['version'], model['version'])
            bad = json.loads(path.read_text())
            bad['model']['version'] = 'tampered'
            path.write_text(json.dumps(bad))
            with self.assertRaises(ValueError):
                load_model(path)


if __name__ == '__main__':
    unittest.main()
