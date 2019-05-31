import * as inquirer from 'inquirer';

export type InquirerPromise = Promise<inquirer.Answer> & { ui: inquirer.ui.PromptUI };

export function createPrompt(questions: inquirer.Question[]): InquirerPromise {
  return inquirer.prompt<inquirer.Answer>(questions);
}
