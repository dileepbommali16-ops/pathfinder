import unittest
from backend.models import StudentProfile
from backend.ml_engine import predict_placement, get_trained_model

class TestMLEngine(unittest.TestCase):
    def test_model_training_and_caching(self):
        model, features = get_trained_model()
        self.assertIsNotNone(model)
        self.assertEqual(len(features), 5)
        self.assertIn("cgpa", features)
        self.assertIn("coding_score", features)

    def test_predict_placement_high_caliber(self):
        profile = StudentProfile(
            cgpa=9.2,
            branch="CSE",
            backlogs=0,
            internships=2,
            communication=9.0,
            coding=9.0
        )
        result = predict_placement(profile)
        self.assertGreaterEqual(result.chance, 65.0)
        self.assertEqual(result.tone, "strong")
        self.assertIsNotNone(result.label)

    def test_predict_placement_at_risk(self):
        profile = StudentProfile(
            cgpa=5.5,
            branch="Mechanical",
            backlogs=3,
            internships=0,
            communication=4.0,
            coding=3.0
        )
        result = predict_placement(profile)
        self.assertLessEqual(result.chance, 60.0)
        self.assertIn(result.tone, ["focus", "steady"])

if __name__ == "__main__":
    unittest.main()
