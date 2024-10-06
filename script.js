#!/usr/bin/env node

import * as execa from 'execa';
import inquirer from 'inquirer';

// Function to list current modules (dependencies from package.json)
const listModules = () => {
  const packageJson = require(`${process.cwd()}/package.json`);
  return Object.keys(packageJson.dependencies || {});
};

// Function to install selected modules
const installModules = async (modules) => {
  try {
    await execa('npm', ['install', ...modules]);
    console.log('Modules installed successfully!');
  } catch (error) {
    console.error('Error installing modules:', error);
  }
};

// Function to handle module selection and removal
const manageModules = async () => {
  const modules = listModules();

  const { selectedModules } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedModules',
      message: 'Select modules to manage:',
      choices: modules,
    },
  ]);

  const { confirmAction } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmAction',
      message: `Do you want to uninstall the selected modules (${selectedModules.join(
        ', ',
      )})?`,
    },
  ]);

  if (confirmAction) {
    await execa('npm', ['uninstall', ...selectedModules]);
    console.log('Selected modules removed successfully!');
  } else {
    console.log('No changes made.');
  }
};

// Main function to run the CLI
const run = async () => {
  console.log('Managing project modules...');
  await manageModules();
};

run();
