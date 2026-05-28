"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorChain = exports.Validator = void 0;
class Validator {
    nextValidator = null;
    setNext(validator) {
        this.nextValidator = validator;
        return validator;
    }
    async validate(context, errors) {
        await this.process(context, errors);
        if (this.nextValidator) {
            await this.nextValidator.validate(context, errors);
        }
    }
}
exports.Validator = Validator;
class ValidatorChain {
    initialValidator;
    constructor(initialValidator) {
        this.initialValidator = initialValidator;
    }
    async handle(context) {
        const errors = [];
        await this.initialValidator.validate(context, errors);
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.ValidatorChain = ValidatorChain;
