import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b, _c, _d;
    var command = _a.command;
    // GitHub Actions'ta GITHUB_REPOSITORY="efurkanakar/exo-ui"
    var repo = (_d = (_c = (_b = process.env.GITHUB_REPOSITORY) === null || _b === void 0 ? void 0 : _b.split('/')) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : 'exo-ui';
    return {
        base: command === 'serve' ? '/' : "/".concat(repo, "/"),
        plugins: [react()],
    };
});
