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
        verified_profile = StudentProfile(
            cgpa=9.2,
            branch="CSE",
            backlogs=0,
            internships=2,
            communication=9.0,
            coding=9.0,
            github_url="https://github.com/torvalds",
            leetcode_url="https://leetcode.com/u/demo",
        )
        verified_result = predict_placement(verified_profile)
        self.assertGreaterEqual(verified_result.chance, 76.0)
        self.assertEqual(verified_result.tone, "strong")
        self.assertIsNotNone(verified_result.label)

        unverified_profile = StudentProfile(
            cgpa=9.2,
            branch="CSE",
            backlogs=0,
            internships=2,
            communication=9.0,
            coding=9.0,
        )
        unverified_result = predict_placement(unverified_profile)
        self.assertLessEqual(unverified_result.chance, 74.0)
        self.assertEqual(unverified_result.tone, "steady")

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
