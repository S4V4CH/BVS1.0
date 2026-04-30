export type ValidationResult = { isValid: boolean; errors: string[] };

export interface ValidationContext {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export abstract class Validator {
  protected nextValidator: Validator | null = null;

  public setNext(validator: Validator): Validator {
    this.nextValidator = validator;
    return validator;
  }

  public async validate(context: ValidationContext, errors: string[]): Promise<void> {
    await this.process(context, errors);
    if (this.nextValidator) {
      await this.nextValidator.validate(context, errors);
    }
  }

  protected abstract process(context: ValidationContext, errors: string[]): Promise<void>;
}

export class ValidatorChain {
  constructor(private readonly initialValidator: Validator) {}

  public async handle(context: ValidationContext): Promise<ValidationResult> {
    const errors: string[] = [];
    await this.initialValidator.validate(context, errors);
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
