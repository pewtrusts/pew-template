module.exports = {
    "extends": "eslint:recommended",
    "env": {
        "es6": true,
        "browser": true
    },
    //"parser": "babel-eslint",     
    "parserOptions": {
        "sourceType": "module", // allows import and export
        "ecmaVersion": 9
        
    },
    "rules": {
         "no-console": "off"
    },
    "globals": {
        "console": "readonly"
    }
}