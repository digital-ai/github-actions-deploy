const { run } = require('../src/index');
const core = require('@actions/core');
const DeployManager = require('../src/deploy-manager');

jest.mock('@actions/core');
jest.mock('../src/deploy-manager');

describe('Invalid Inputs', () => {
    beforeEach(() => {
        // Reset mocks
        core.getInput.mockReset();
        core.setFailed.mockReset();
        core.error.mockReset();
        // Stub core.summary to avoid undefined errors
        core.summary = {
            addHeading: jest.fn().mockReturnThis(),
            addSeparator: jest.fn().mockReturnThis(),
            addCodeBlock: jest.fn().mockReturnThis(),
            write: jest.fn().mockResolvedValue(),
        };
        DeployManager.getServerState.mockReset();
    });

    test('Missing serverUrl, username, and password', async () => {
        // Mocking inputs: only action provided
        core.getInput.mockImplementation((name) => {
            if (name === 'action') return 'create_publish_deploy';
            return '';
        });

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
            'serverUrl, username, and password are required for all actions.'
        );
    });

    test('Missing manifestPath, darPackagePath, and environmentId', async () => {
        // Mocking inputs: server connection inputs provided, rest missing
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
                default:
                    return '';
            }
        });

        DeployManager.getServerState.mockResolvedValue('RUNNING');

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
            "Input 'manifestPath' is required for action 'create_publish_deploy'."
        );
    });
});