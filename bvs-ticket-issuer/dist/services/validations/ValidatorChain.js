"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorChain = exports.Validator = void 0;
class Validator {
    nextValidator = null;
    setNext(validator) {
        this.nextValidator = validator;
        return validator; // Permite chaining (a.setNext(b).setNext(c))
    }
    async validate(command, errors) {
        await this.process(command, errors);
        if (this.nextValidator) {
            await this.nextValidator.validate(command, errors);
        }
    }
}
exports.Validator = Validator;
class ValidatorChain {
    initialValidator;
    constructor(initialValidator) {
        this.initialValidator = initialValidator;
    }
    async handle(command) {
        const errors = [];
        await this.initialValidator.validate(command, errors);
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.ValidatorChain = ValidatorChain;
