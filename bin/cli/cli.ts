#!/usr/bin/env node
import { Command } from 'commander';
import { manageModules } from './manage-modules';

const program = new Command();

program
  .name('@kirz/expo-toolkit')
  .description('CLI for managing expo modules')
  .version('1.0.0');

// Define the "modules" command
program
  .command('modules')
  .description('Manage expo modules')
  .action(() => {
    manageModules()
  });

// Define the "env" command
program
  .command('env')
  .description('Print environment variables')
  .action(() => {
    console.error('Not implemented yet');
  });

program.parse(process.argv);