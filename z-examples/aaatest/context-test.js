const api = require("@opentelemetry/api");

const key = api.createContextKey('Key to store a value');

const ctx = api.context.active(); // Returns ROOT_CONTEXT when no context is active
const ctx2 = ctx.setValue(key, 'context 2'); // does not modify ctx

console.log(ctx.getValue(key)); //? undefined
console.log(ctx2.getValue(key)); //? "context 2"

const ret = api.context.with(ctx2, () => {
    const ctx3 = api.context.active().setValue(key, 'context 3');

    console.log(api.context.active().getValue(key)); //? "context 2"
    console.log(ctx.getValue(key)); //? undefined
    console.log(ctx2.getValue(key)); //? "context 2"
    console.log(ctx3.getValue(key)); //? "context 3"

    api.context.with(ctx3, () => {
        console.log(api.context.active().getValue(key)); //? "context 3"
    });
    console.log(api.context.active().getValue(key)); //? "context 2"

    return 'return value';
});

// The value returned by the callback is returned to the caller
console.log(ret); //? "return value"
