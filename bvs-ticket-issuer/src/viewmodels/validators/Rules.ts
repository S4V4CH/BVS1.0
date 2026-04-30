import { Validator, ValidationContext } from './ValidatorChain';

export class ValidUUIDFormatValidator extends Validator {
  protected async process(context: ValidationContext, errors: string[]): Promise<void> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(context.voteId)) {
      errors.push("voteId must be a valid UUID v4");
    }
  }
}

export class VoterTokenPresentValidator extends Validator {
  protected async process(context: ValidationContext, errors: string[]): Promise<void> {
    if (!context.voterToken || context.voterToken.length < 10) {
      errors.push("voterToken must be a structurally valid identifier (min 10 chars)");
    }
  }
}
