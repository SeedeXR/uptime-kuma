const { BeanModel } = require("redbean-node/dist/bean-model");
const passwordHash = require("../password-hash");
const { R } = require("redbean-node");
const jwt = require("jsonwebtoken");
const { shake256, SHAKE256_LENGTH } = require("../util-server");
const { passwordStrength } = require("check-password-strength");
const { log } = require("../../src/util");

class User extends BeanModel {
    /**
     * Reset user password
     * Fix #1510, as in the context reset-password.js, there is no auto model mapping. Call this static function instead.
     * @param {number} userID ID of user to update
     * @param {string} newPassword Users new password
     * @returns {Promise<void>}
     */
    static async resetPassword(userID, newPassword) {
        // Also voids any pending emailed reset link
        await R.exec("UPDATE `user` SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ? ", [
            await passwordHash.generate(newPassword),
            userID,
        ]);
    }

    /**
     * Create the admin named in SEEDE_ADMIN_USERNAME / SEEDE_ADMIN_PASSWORD (deploy secrets)
     * if no user with that username exists yet. Never updates an existing user, so a
     * password changed in Settings is not reset on the next deploy.
     * @param {object} env Environment, usually process.env
     * @returns {Promise<boolean>} true if a user was created
     */
    static async ensureAdminFromEnv(env) {
        const username = (env.SEEDE_ADMIN_USERNAME || "").trim();
        if (!username || (await R.findOne("user", " username = ? ", [username]))) {
            return false;
        }
        const password = env.SEEDE_ADMIN_PASSWORD || "";
        if (passwordStrength(password).value === "Too weak") {
            log.error("server", `SEEDE_ADMIN_PASSWORD is missing or too weak; admin ${username} was not created`);
            return false;
        }
        const user = R.dispense("user");
        user.username = username;
        user.password = await passwordHash.generate(password);
        user.active = true;
        await R.store(user);
        log.info("server", `Created admin ${username} from SEEDE_ADMIN_USERNAME`);
        return true;
    }

    /**
     * Reset this users password
     * @param {string} newPassword Users new password
     * @returns {Promise<void>}
     */
    async resetPassword(newPassword) {
        const hashedPassword = await passwordHash.generate(newPassword);

        await R.exec("UPDATE `user` SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ? ", [hashedPassword, this.id]);

        this.password = hashedPassword;
    }

    /**
     * Create a new JWT for a user
     * @param {User} user The User to create a JsonWebToken for
     * @param {string} jwtSecret The key used to sign the JsonWebToken
     * @returns {string} the JsonWebToken as a string
     */
    static createJWT(user, jwtSecret) {
        return jwt.sign(
            {
                username: user.username,
                h: shake256(user.password, SHAKE256_LENGTH),
            },
            jwtSecret
        );
    }
}

module.exports = User;
