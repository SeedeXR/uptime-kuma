// Seede XR: email password reset + scoped API keys (MCP tokens)
exports.up = async (knex) => {
    await knex.schema.alterTable("user", (table) => {
        table.string("reset_token_hash", 64).defaultTo(null); // sha256 of the emailed token
        table.datetime("reset_token_expires").defaultTo(null);
    });
    await knex.schema.alterTable("api_key", (table) => {
        table.string("scope", 32).defaultTo(null); // null = /metrics key, "mcp-read" / "mcp-write" = MCP token
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable("user", (table) => {
        table.dropColumn("reset_token_hash");
        table.dropColumn("reset_token_expires");
    });
    await knex.schema.alterTable("api_key", (table) => {
        table.dropColumn("scope");
    });
};
