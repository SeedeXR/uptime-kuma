const { describe, test, before, after } = require("node:test");
const assert = require("node:assert");
const { R } = require("redbean-node");
const User = require("../../server/model/user");
const passwordHash = require("../../server/password-hash");

describe("User.ensureAdminFromEnv", () => {
    before(async () => {
        const Dialect = require("knex/lib/dialects/sqlite3/index.js");
        Dialect.prototype._driver = () => require("@louislam/sqlite3");
        R.setup(require("knex")({ client: Dialect, connection: { filename: ":memory:" }, useNullAsDefault: true }));
        await R.knex.schema.createTable("user", (t) => {
            t.increments("id");
            t.string("username");
            t.string("password");
            t.boolean("active");
        });
    });

    after(async () => {
        await R.knex.destroy();
    });

    const env = { SEEDE_ADMIN_USERNAME: " a.mkwizu@seedexr.com ", SEEDE_ADMIN_PASSWORD: "Correct-Horse-42!" };

    test("does nothing without a username, refuses a weak password", async () => {
        assert.strictEqual(await User.ensureAdminFromEnv({}), false);
        assert.strictEqual(await User.ensureAdminFromEnv({ ...env, SEEDE_ADMIN_PASSWORD: "" }), false);
        assert.strictEqual(await User.ensureAdminFromEnv({ ...env, SEEDE_ADMIN_PASSWORD: "123" }), false);
        assert.strictEqual((await R.knex("user").count("id as c").first()).c, 0);
    });

    test("creates the admin once and never overwrites its password", async () => {
        assert.strictEqual(await User.ensureAdminFromEnv(env), true);
        const user = await R.findOne("user", " username = ? ", ["a.mkwizu@seedexr.com"]);
        assert.ok(passwordHash.verify(env.SEEDE_ADMIN_PASSWORD, user.password));
        assert.ok(user.active);

        assert.strictEqual(await User.ensureAdminFromEnv({ ...env, SEEDE_ADMIN_PASSWORD: "Another-Strong-99!" }), false);
        const again = await R.findOne("user", " username = ? ", ["a.mkwizu@seedexr.com"]);
        assert.strictEqual(again.password, user.password);
        assert.strictEqual((await R.knex("user").count("id as c").first()).c, 1);
    });
});
