# Rostrum score engine

Forked from `1921music/mscz_webviewer` commit
`3a56c6331af54601cc03e505472f902e2a914426`.
This is an independently maintained copy, not a submodule. Preserve the GPL-3.0
source headers, LICENSE.txt, THIRD_PARTY_NOTICES.md and vendor provenance.

Build inside WSL from this directory with `mise exec -- bash scripts/build-wasm.sh`.
Set BUILD_DIR to an absolute directory outside the source tree. The web payload
is subsequently embedded into Rostrum by `build_score_engine.py`.
