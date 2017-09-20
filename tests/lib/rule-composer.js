'use strict';

const eslint = require('eslint');
const ruleComposer = require('../..');

const RuleTester = eslint.RuleTester;
const ruleTester = new RuleTester();
const coreRules = new eslint.Linter().getRules();

ruleTester.run(
  'filterReports',
  ruleComposer.filterReports(coreRules.get('no-undef'), descriptor => descriptor.node && descriptor.node.name !== 'foo'),
  {
    valid: [
      'foo;',
      'var bar; bar;',
    ],
    invalid: [
      {
        code: 'bar;',
        errors: [{ line: 1, column: 1 }],
      },
      {
        code: 'foo; bar;',
        errors: [{ line: 1, column: 6 }],
      },
      {
        code: 'bar; foo;',
        errors: [{ line: 1, column: 1 }],
      },
    ],
  }
);

ruleTester.run(
  'joinReports',
  ruleComposer.joinReports([
    context => ({ Program: node => context.report(node, 'foo') }),
    context => ({ 'Program:exit': node => context.report(node, 'bar') }),
    { create: context => ({ 'Program:exit': node => context.report(node, 'baz') }) },
  ]),
  {
    valid: [],
    invalid: [
      {
        code: 'a',
        errors: [
          { type: 'Program', message: 'foo' },
          { type: 'Program', message: 'bar' },
          { type: 'Program', message: 'baz' },
        ],
      },
    ],
  }
);

ruleTester.run(
  'mapReports',
  ruleComposer.mapReports(
    context => ({ Program: node => context.report({ node, message: 'foo' }) }),
    descriptor => Object.assign({}, descriptor, { message: descriptor.message.toUpperCase() })
  ),
  {
    valid: [],
    invalid: [
      {
        code: 'a',
        errors: [
          { type: 'Program', message: 'FOO' },
        ],
      },
    ],
  }
);

ruleTester.run(
  'checking the first token of the report',
  ruleComposer.filterReports(
    coreRules.get('no-unused-expressions'),
    (problem, metadata) => metadata.sourceCode.getFirstToken(problem.node).value !== 'expect'
  ),
  {
    valid: [
      'expect(foo).to.be.true;',
      'expect;',
    ],
    invalid: [
      {
        code: 'foo;',
        errors: 1,
      },
    ],
  }
);
