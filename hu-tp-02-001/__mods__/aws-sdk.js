// __mocks__/aws-sdk.js

const CognitoIdentityServiceProvider = {
    signUp: jest.fn().mockReturnThis(),
    confirmSignUp: jest.fn().mockReturnThis(),
    initiateAuth: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({}), // Simulación de la respuesta de AWS
};

const AWS = {
    CognitoIdentityServiceProvider: jest.fn(() => CognitoIdentityServiceProvider),
    config: {
        update: jest.fn(),
    },
};

module.exports = AWS;
