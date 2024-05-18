const { run } = require('../src/index');
const core = require('@actions/core');
const DeployManager = require('../src/deploy-manager');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('../src/deploy-manager');


describe('Invalid Inputs', () => {
    beforeEach(() => {
        // Reset the mock implementation for core.getInput and DeployManager.getServerState before each test
        core.getInput.mockReset();
        DeployManager.getServerState.mockReset();
    });

    test('Missing serverUrl, username, and password', async () => {
        // Mocking inputs
        core.getInput.mockImplementation((name) => {
            switch (name) {
                case 'action':
                    return 'create_publish_deploy';
                // Missing serverUrl, username, and password
                default:
                    return '';
            }
        });

        await run();

        expect(core.setFailed).toHaveBeenCalledWith('serverUrl, username, and password are required.');
    });

    test('Missing manifestPath, darPackagePath, and environmentId', async () => {
        // Mocking inputs
        core.getInput.mockImplementation((name) => {
            switch (name) {
                case 'action':
                    return 'create_publish_deploy';
                case 'serverUrl':
                    return 'https://example.com';
                case 'username':
                    return 'testuser';
                case 'password':
                    return 'testpassword';
                // Other necessary inputs
                default:
                    return '';
            }
        });

        DeployManager.getServerState.mockResolvedValue('RUNNING');

        await run();

        expect(core.setFailed).toHaveBeenCalledWith("manifestPath is required for action 'create_publish_deploy'.");
    });

});
