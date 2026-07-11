const { checkLogin, doubleCheckPassword } = require("../util-server");
const { log } = require("../../src/util");
const { R } = require("redbean-node");
const passwordHash = require("../password-hash");
const { passwordStrength } = require("check-password-strength");
const TranslatableError = require("../translatable-error");
const User = require("../model/user");
const { UptimeKumaServer } = require("../uptime-kuma-server");

const server = UptimeKumaServer.getInstance();

/**
 * Handlers for managing admin users (multi-admin support).
 * Every logged-in user is an admin (there is no role column), so any authenticated
 * user may manage users. All mutations require re-entering the acting admin's own
 * password (doubleCheckPassword), mirroring changePassword / 2FA handlers.
 * @param {Socket} socket Socket.io instance
 * @returns {void}
 */
module.exports.userSocketHandler = (socket) => {
    // List all admin users (never expose password hashes or 2FA secrets)
    socket.on("getUserList", async (callback) => {
        try {
            checkLogin(socket);

            const userList = await R.getAll(
                "SELECT id, username, active FROM `user` ORDER BY id"
            );

            callback({
                ok: true,
                userList,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
                msgi18n: !!e.msgi18n,
            });
        }
    });

    // Add a new admin user
    socket.on("addUser", async (params, callback) => {
        try {
            checkLogin(socket);
            await doubleCheckPassword(socket, params.currentPassword);

            const username = (params.username || "").trim();
            if (!username) {
                throw new Error("Username is required");
            }

            if (passwordStrength(params.password).value === "Too weak") {
                throw new TranslatableError("passwordTooWeak");
            }

            const existing = await R.findOne("user", " username = ? ", [ username ]);
            if (existing) {
                throw new Error("Username already exists");
            }

            const user = R.dispense("user");
            user.username = username;
            user.password = await passwordHash.generate(params.password);
            user.active = true;
            await R.store(user);

            log.info("user", `Added admin user: ${username}`);

            callback({
                ok: true,
                msg: "successAdded",
                msgi18n: true,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
                msgi18n: !!e.msgi18n,
            });
        }
    });

    // Delete an admin user (cannot delete yourself; cannot remove the last user)
    socket.on("deleteUser", async (params, callback) => {
        try {
            checkLogin(socket);
            await doubleCheckPassword(socket, params.currentPassword);

            const userID = Number(params.userID);

            if (userID === socket.userID) {
                throw new Error("You cannot delete your own account.");
            }

            const count = (await R.knex("user").count("id as count").first()).count;
            if (count <= 1) {
                throw new Error("Cannot delete the last remaining user.");
            }

            await R.exec("DELETE FROM `user` WHERE id = ? ", [ userID ]);

            // Kick the deleted user off any active sessions
            server.disconnectAllSocketClients(userID);

            log.info("user", `Deleted admin user id: ${userID}`);

            callback({
                ok: true,
                msg: "successDeleted",
                msgi18n: true,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
                msgi18n: !!e.msgi18n,
            });
        }
    });

    // Reset another user's password (admin action)
    socket.on("resetUserPassword", async (params, callback) => {
        try {
            checkLogin(socket);
            await doubleCheckPassword(socket, params.currentPassword);

            if (passwordStrength(params.newPassword).value === "Too weak") {
                throw new TranslatableError("passwordTooWeak");
            }

            const target = await R.findOne("user", " id = ? ", [ params.userID ]);
            if (!target) {
                throw new Error("User not found");
            }

            await User.resetPassword(params.userID, params.newPassword);

            // Their existing JWTs are now invalid (token embeds a password hash) — disconnect them
            server.disconnectAllSocketClients(params.userID);

            log.info("user", `Reset password for user id: ${params.userID}`);

            callback({
                ok: true,
                msg: "successAuthChangePassword",
                msgi18n: true,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
                msgi18n: !!e.msgi18n,
            });
        }
    });

    // Enable / disable a user (cannot disable yourself; keep at least one active)
    socket.on("setUserActive", async (params, callback) => {
        try {
            checkLogin(socket);
            await doubleCheckPassword(socket, params.currentPassword);

            const userID = Number(params.userID);
            const active = !!params.active;

            if (!active) {
                if (userID === socket.userID) {
                    throw new Error("You cannot deactivate your own account.");
                }
                const activeCount = (await R.knex("user").where("active", true).count("id as count").first()).count;
                if (activeCount <= 1) {
                    throw new Error("Cannot deactivate the last active user.");
                }
            }

            await R.exec("UPDATE `user` SET active = ? WHERE id = ? ", [ active, userID ]);

            if (!active) {
                server.disconnectAllSocketClients(userID);
            }

            log.info("user", `Set user id ${userID} active=${active}`);

            callback({
                ok: true,
                msg: "successUpdated",
                msgi18n: true,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
                msgi18n: !!e.msgi18n,
            });
        }
    });
};
