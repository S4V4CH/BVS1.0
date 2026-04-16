import { EmitTicketCommand } from '../../domain/ports/in/EmitTicketUseCase';

export type ValidationResult = { isValid: boolean; errors: string[] };

export abstract class Validator {
  protected nextValidator: Validator | null = null;

  public setNext(validator: Validator): Validator {
    this.nextValidator = validator;
    return validator; // Permite chaining (a.setNext(b).setNext(c))
  }

  public async validate(command: EmitTicketCommand, errors: string[]): Promise<void> {
    await this.process(command, errors);
    if (this.nextValidator) {
      await this.nextValidator.validate(command, errors);
    }
  }

  protected abstract process(command: EmitTicketCommand, errors: string[]): Promise<void>;
}

export class ValidatorChain {
  constructor(private readonly initialValidator: Validator) {}

  public async handle(command: EmitTicketCommand): Promise<ValidationResult> {
    const errors: string[] = [];
    await this.initialValidator.validate(command, errors);
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
