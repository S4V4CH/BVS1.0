import { Validator } from './ValidatorChain';
import { EmitTicketCommand } from '../../models/ports/EmitTicketUseCase';

export class ValidUUIDFormatValidator extends Validator {
  protected async process(command: EmitTicketCommand, errors: string[]): Promise<void> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(command.voteId)) {
      errors.push("voteId must be a valid UUID v4");
    }
  }
}

export class VoterTokenPresentValidator extends Validator {
  protected async process(command: EmitTicketCommand, errors: string[]): Promise<void> {
    if (!command.voterToken || command.voterToken.length < 10) {
      errors.push("voterToken must be a structurally valid identifier (min 10 chars)");
    }
  }
}
