#!/usr/bin/env python3
"""Deploy one Rostrum build while preserving the other published variant."""
import argparse
from pathlib import Path
import re
import subprocess


def git(repo, *args, data=None):
    result = subprocess.run(['git', '-C', str(repo), *args], input=data,
                            capture_output=True, check=True)
    return result.stdout.decode('utf-8').strip()


def directory_tree(repo, directory):
    entries = []
    for path in sorted(directory.iterdir()):
        if path.is_dir():
            entries.append(f'040000 tree {directory_tree(repo, path)}\t{path.name}\n')
        else:
            blob = git(repo, 'hash-object', '-w', '--no-filters', str(path.resolve()))
            entries.append(f'100644 blob {blob}\t{path.name}\n')
    return git(repo, 'mktree', data=''.join(entries).encode())


def compose_tree(repo, directory, parent, target=''):
    """Root updates retain the wink build; wink updates retain the entire root."""
    built = directory_tree(repo, directory)
    old = git(repo, 'ls-tree', parent).splitlines()
    if target:
        entries = [line for line in old if line.split('\t', 1)[1] != target]
        entries.append(f'040000 tree {built}\t{target}')
    else:
        entries = git(repo, 'ls-tree', built).splitlines()
        entries.extend(line for line in old if line.split('\t', 1)[1] == 'wink-page-turn')
    return git(repo, 'mktree', data=('\n'.join(entries) + '\n').encode())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('message', nargs='?')
    parser.add_argument('--path', default='', choices=['', 'wink-page-turn'])
    parser.add_argument('--directory', type=Path, default=Path('build/pages'))
    parser.add_argument('--remote', default='origin')
    parser.add_argument('--dry-run', action='store_true', help='prepare and report the tree without pushing')
    args = parser.parse_args()
    repo = Path(git(Path.cwd(), 'rev-parse', '--show-toplevel'))
    if git(repo, 'status', '--porcelain', '--untracked-files=no'):
        parser.error('commit tracked changes before building and deploying')
    page = args.directory / 'index.html'
    if not page.is_file():
        parser.error('build/pages/index.html is missing; run build.py --pages')
    source = git(repo, 'rev-parse', 'HEAD')
    html = page.read_text(encoding='utf-8')
    if source not in html or source + '-dirty' in html:
        parser.error('the build does not match HEAD; rebuild with build.py --rostrum --pages')
    # Avoid accidentally publishing a copied full deployment inside itself.
    if (args.directory / 'wink-page-turn').exists():
        parser.error('the input must contain one variant, without a wink-page-turn directory')
    git(repo, 'fetch', '--quiet', args.remote, 'gh-pages')
    parent = git(repo, 'rev-parse', f'refs/remotes/{args.remote}/gh-pages')
    tree = compose_tree(repo, args.directory, parent, args.path)
    if tree == git(repo, 'rev-parse', parent + '^{tree}'):
        print('The published files are already up to date.')
        return
    if args.dry_run:
        print(f'Prepared tree {tree} for /{args.path} from {source}')
        return
    message = args.message or f'Deploy {args.path or "main"} {source[:8]}'
    commit = git(repo, 'commit-tree', tree, '-p', parent, '-m', message)
    git(repo, 'push', args.remote, f'{commit}:refs/heads/gh-pages')
    git(repo, 'fetch', '--quiet', args.remote, 'gh-pages')
    git(repo, 'update-ref', 'refs/heads/gh-pages', commit)
    print(f'Deployed {commit}: {message}')


if __name__ == '__main__':
    main()
