import * as ruleComposer from '../..';

let ruleModule: import('eslint').Rule.RuleModule;

ruleComposer.mapReports(ruleModule, (problem, metadata) => {
  problem.data;
  problem.loc.start;
  problem.loc.end;
  problem.message.substr(0);
  problem.messageId.substr(0);

  problem.fix = void 0;
  problem.fix = () => null;
  problem.fix = fixer => fixer.remove(problem.node);
  problem.fix = fixer => [fixer.remove(problem.node)];

  metadata.filename.substr(0);
  metadata.options[0];
  metadata.settings;
  metadata.sourceCode.getText(problem.node);

  return problem;
});

ruleComposer.filterReports(ruleModule, (problem, metadata) => false);

ruleComposer.joinReports([ruleModule, ruleModule]);
