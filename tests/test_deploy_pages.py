import tempfile
from pathlib import Path
import subprocess
import unittest

from deploy_pages import compose_tree, directory_tree, git


class DeployVariantsTest(unittest.TestCase):
    def test_updates_preserve_other_variant_and_remove_stale_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            subprocess.run(['git', 'init', '-q', str(repo)], check=True)
            original = repo / 'original'
            original.mkdir()
            (original / 'index.html').write_text('stable one')
            (original / 'obsolete.js').write_text('remove on stable update')
            parent = directory_tree(repo, original)
            wink = repo / 'wink'
            wink.mkdir()
            (wink / 'index.html').write_text('wink one')
            deployed = compose_tree(repo, wink, parent, 'wink-page-turn')
            self.assertEqual(git(repo, 'show', deployed + ':index.html'), 'stable one')
            self.assertEqual(git(repo, 'show', deployed + ':wink-page-turn/index.html'), 'wink one')
            stable = repo / 'stable'
            stable.mkdir()
            (stable / 'index.html').write_text('stable two')
            updated = compose_tree(repo, stable, deployed)
            self.assertEqual(git(repo, 'show', updated + ':index.html'), 'stable two')
            self.assertEqual(git(repo, 'show', updated + ':wink-page-turn/index.html'), 'wink one')
            self.assertNotIn('obsolete.js', git(repo, 'ls-tree', updated))
            (wink / 'index.html').write_text('wink two')
            final = compose_tree(repo, wink, updated, 'wink-page-turn')
            self.assertEqual(git(repo, 'show', final + ':index.html'), 'stable two')
            self.assertEqual(git(repo, 'show', final + ':wink-page-turn/index.html'), 'wink two')


if __name__ == '__main__':
    unittest.main()
