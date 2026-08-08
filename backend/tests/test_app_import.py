import unittest

class AppImportTest(unittest.TestCase):
    def test_app_factory_imports(self):
        from app.factory import create_app
        app = create_app()
        self.assertIsNotNone(app)
        self.assertTrue(any(route.path == "/" for route in app.routes))

if __name__ == "__main__":
    unittest.main()
