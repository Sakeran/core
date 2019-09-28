"use strict";

/**
 * Stores instances of TransportDecorators and rules for applying them
 * @property {Map<string, TransportDecorator>} decorators
 * @property {Map<string, Array<TransportDecorationRule>} rules
 */
class TransportDecoratorRegistry {
  constructor() {
    this.decorators = new Map();
    this.rules = new Map();
  }

  /**
   * Load and configure TransportDecorators
   * @param {Function} requireFn used to require() the decorator
   * @param {string} rootPath project root
   * @param {object} config configuration to load
   */
  loadDecorators(requireFn, rootPath, config = {}) {
    for (const [name, settings] of Object.entries(config)) {
      if (!settings.hasOwnProperty("require")) {
        throw new Error(
          `TransportDecorator [${name}] does not specify a 'require'`
        );
      }

      if (typeof settings.require !== "string") {
        throw new TypeError(
          `TransportDecorator [${name}] has an invalid 'require'`
        );
      }

      const sourceConfig = settings.config || {};

      let decorator = null;

      // relative path to require
      if (settings.require[0] === ".") {
        decorator = require(rootPath + "/" + settings.require);
      } else if (!settings.require.includes(".")) {
        decorator = require(settings.require);
      } else {
        const [moduleName, exportName] = settings.require.split(".");
        decorator = requireFn(moduleName)[exportName];
      }

      const instance = new decorator();

      if (!("decorate" in instance)) {
        throw new Error(
          `TransportDecorator ${name} requires a 'decorate(TransportStream): TransportStream' method`
        );
      }

      if (!("configure" in instance)) {
        throw new Error(
          `TransportDecorator ${name} requires a 'configure(object)' method`
        );
      }
      instance.name = name;

      instance.configure(sourceConfig);
      this.decorators.set(name, instance);
    }
  }

  /**
   * Load and validate TransportDecoration rule sets
   * @param {object} config configuration to load
   */
  loadRules(config = {}) {
    for (const [identifier, rules] of Object.entries(config)) {
      if (!Array.isArray(rules))
        throw new Error(
          `TransportDecoration rules for "${identifier}" must be an array.`
        );

      // Ensure each rule defined is valid.
      for (const rule of rules) {
        const decorator = rule.decorator;

        if (!decorator)
          throw new Error(
            `TransportDecoration rule for "${identifier}" does not specify a decorator.`
          );

        if (!this.decorators.has(decorator))
          throw new Error(
            `TransportDecoration rule for "${identifier}" specifies a non-existent decorator: ${decorator}`
          );
      }

      this.rules.set(identifier, rules);
    }
  }

  /**
   * Creates a decorated TransportStream class.
   * @param {Function<TransportStream>} streamConstructor
   * @return {Function<TransportStream>}
   */
  decorate(streamConstructor) {
    const identifier = streamConstructor.identifier;
    if (!identifier)
      throw new Error("TransportStreams must define a 'identifier' getter.");

    const decorators = this.getRules(identifier).map(
      ({ decorator, config }) => message =>
        this.decorators.get(decorator).decorate(message, config || {})
    );

    return class extends streamConstructor {
      write(message, encoding) {
        message = decorators.reduce((acc, decorate) => decorate(acc), message);
        super.write(message, encoding);
      }
    };
  }

  /**
   * Returns the TransportDecorationRules specified for the given identifier.
   * @param {string} identifier
   */
  getRules(identifier) {
    if (!this.rules.has(identifier)) return [];
    return this.rules.get(identifier);
  }
}

module.exports = TransportDecoratorRegistry;
