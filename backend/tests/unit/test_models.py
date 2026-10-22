"""
Unit Tests: Model Validation & Pydantic Schemas (Photo 4)
Uses standard Python unittest for zero-dependency execution.
"""

import unittest
from pydantic import ValidationError
from backend.models import StudentProfile, ChatMessage


class TestModels(unittest.TestCase):
    def test_valid_student_profile(self):
        profile = StudentProfile(
            cgpa=8.5,
            backlogs=0,
            internships=2,
            coding=8.0,
            communication=8.5,
            target_role="Software Development Engineer (SDE)"
        )
        self.assertEqual(profile.cgpa, 8.5)
        self.assertEqual(profile.backlogs, 0)
        self.assertEqual(profile.target_role, "Software Development Engineer (SDE)")

    def test_invalid_cgpa_out_of_bounds(self):
        # CGPA cannot exceed 10.0
        with self.assertRaises(ValidationError):
            StudentProfile(
                cgpa=12.5,
                backlogs=0,
                internships=1,
                coding=7.0,
                communication=7.0,
                target_role="Data Scientist"
            )

    def test_chat_message_schema(self):
        msg = ChatMessage(role="user", content="How do I prepare for campus placements?")
        self.assertEqual(msg.role, "user")
        self.assertIn("placements", msg.content)


if __name__ == "__main__":
    unittest.main()
