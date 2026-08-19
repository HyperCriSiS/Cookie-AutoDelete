const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    return ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        sourceMap: true,
        target: ts.ScriptTarget.ES2017,
      },
    }).outputText;
  },
};
