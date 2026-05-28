"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoterTokenPresentValidator = exports.ValidUUIDFormatValidator = void 0;
const ValidatorChain_1 = require("./ValidatorChain");
class ValidUUIDFormatValidator extends ValidatorChain_1.Validator {
    async process(context, errors) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(context.voteId)) {
            errors.push("voteId must be a valid UUID v4");
        }
    }
}
exports.ValidUUIDFormatValidator = ValidUUIDFormatValidator;
class VoterTokenPresentValidator extends ValidatorChain_1.Validator {
    async process(context, errors) {
        if (!context.voterToken || context.voterToken.length < 10) {
            errors.push("voterToken must be a structurally valid identifier (min 10 chars)");
        }
    }
}
exports.VoterTokenPresentValidator = VoterTokenPresentValidator;
