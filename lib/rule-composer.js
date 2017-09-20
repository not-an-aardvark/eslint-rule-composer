'use strict';

/**
 * Translates a multi-argument context.report() call into a single object argument call
 * @param {...*} arguments A list of arguments passed to `context.report`
 * @returns {MessageDescriptor} A normalized object containing report information
 */
function normalizeMultiArgReportCall() {
  // If there is one argument, it is considered to be a new-style call already.
  if (arguments.length === 1) {
    return arguments[0];
  }

  // If the second argument is a string, the arguments are interpreted as [node, message, data, fix].
  if (typeof arguments[1] === 'string') {
    return {
      node: arguments[0],
      message: arguments[1],
      data: arguments[2],
      fix: arguments[3],
    };
  }

  // Otherwise, the arguments are interpreted as [node, loc, message, data, fix].
  return {
    node: arguments[0],
    loc: arguments[1],
    message: arguments[2],
    data: arguments[3],
    fix: arguments[4],
  };
}

/**
 * Normalizes a MessageDescriptor to always have a `loc` with `start` and `end` properties
 * @param {MessageDescriptor} descriptor A descriptor for the report from a rule.
 * @returns {{start: Location, end: (Location|null)}} An updated location that infers the `start` and `end` properties
 * from the `node` of the original descriptor, or infers the `start` from the `loc` of the original descriptor.
 */
function normalizeReportLoc(descriptor) {
  if (descriptor.loc) {
    if (descriptor.loc.start) {
      return descriptor.loc;
    }
    return { start: descriptor.loc, end: null };
  }
  return descriptor.node.loc;
}


/**
 * Interpolates data placeholders in report messages
 * @param {MessageDescriptor} descriptor The report message descriptor.
 * @returns {string} The interpolated message for the descriptor
 */
function normalizeMessagePlaceholders(descriptor) {
  if (!descriptor.data) {
    return descriptor.message;
  }
  return descriptor.message.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (fullMatch, term) => {
    if (term in descriptor.data) {
      return descriptor.data[term];
    }

    return fullMatch;
  });
}

function normalizeReport() {
  const descriptor = normalizeMultiArgReportCall.apply(null, arguments);
  return {
    node: descriptor.node,
    message: normalizeMessagePlaceholders(descriptor),
    loc: normalizeReportLoc(descriptor),
    fix: descriptor.fix,
  };
}

function getRuleCreateFunc(rule) {
  return typeof rule === 'function' ? rule : rule.create;
}

module.exports = Object.freeze({
  filterReports(rule, predicate) {
    return Object.freeze({
      create(context) {
        const sourceCode = context.getSourceCode();
        return getRuleCreateFunc(rule)(
          Object.freeze(
            Object.create(
              context,
              {
                report: {
                  enumerable: true,
                  value() {
                    const reportDescriptor = normalizeReport.apply(null, arguments);
                    if (predicate(reportDescriptor, { sourceCode })) {
                      context.report(reportDescriptor);
                    }
                  },
                },
              }
            )
          )
        );
      },
      schema: rule.schema,
      meta: rule.meta,
    });
  },
  mapReports(rule, iteratee) {
    return Object.freeze({
      create(context) {
        const sourceCode = context.getSourceCode();
        return getRuleCreateFunc(rule)(
          Object.freeze(
            Object.create(
              context,
              {
                report: {
                  enumerable: true,
                  value() {
                    context.report(iteratee(normalizeReport.apply(null, arguments), { sourceCode }));
                  },
                },
              }
            )
          )
        );
      },
      schema: rule.schema,
      meta: rule.meta,
    });
  },
  joinReports(rules) {
    return Object.freeze({
      create(context) {
        return rules
          .map(rule => getRuleCreateFunc(rule)(context))
          .reduce(
            (allListeners, ruleListeners) =>
              Object.keys(ruleListeners).reduce(
                (combinedListeners, key) => {
                  const currentListener = combinedListeners[key];
                  const ruleListener = ruleListeners[key];
                  if (currentListener) {
                    return Object.assign({}, combinedListeners, {
                      [key]() {
                        currentListener.apply(null, arguments);
                        ruleListener.apply(null, arguments);
                      },
                    });
                  }
                  return Object.assign({}, combinedListeners, { [key]: ruleListener });
                },
                allListeners
              ),
            Object.create(null)
          );
      },
      meta: { fixable: 'code' },
    });
  },
});
