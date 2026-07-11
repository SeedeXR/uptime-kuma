<template>
    <div>
        <h4 class="mb-3">{{ $t("Users") }}</h4>

        <p class="text-secondary">
            {{ $t("usersDescription") }}
        </p>

        <!-- Current password — required to confirm any change -->
        <div class="mb-4">
            <label class="form-label">{{ $t("Current Password") }}</label>
            <input
                v-model="currentPassword"
                type="password"
                class="form-control"
                autocomplete="current-password"
                data-testid="current-password"
            />
            <div class="form-text">{{ $t("currentPasswordRequired") }}</div>
        </div>

        <!-- User list -->
        <table class="table">
            <thead>
                <tr>
                    <th>{{ $t("Username") }}</th>
                    <th>{{ $t("Active") }}</th>
                    <th class="text-end">{{ $t("Actions") }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="user in userList" :key="user.id" data-testid="user-row">
                    <td data-testid="user-username">{{ user.username }}</td>
                    <td>
                        <span class="badge" :class="user.active ? 'bg-success' : 'bg-secondary'">
                            {{ user.active ? $t("Active") : $t("Inactive") }}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-normal btn-sm me-1" @click="startReset(user)">
                            {{ $t("Reset Password") }}
                        </button>
                        <button
                            class="btn btn-normal btn-sm me-1"
                            @click="toggleActive(user)"
                        >
                            {{ user.active ? $t("Deactivate") : $t("Activate") }}
                        </button>
                        <button
                            class="btn btn-danger btn-sm"
                            :disabled="user.username === $root.username"
                            data-testid="delete-user-button"
                            @click="deleteUser(user)"
                        >
                            {{ $t("Delete") }}
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Add user -->
        <h5 class="mt-4 mb-3">{{ $t("Add User") }}</h5>
        <form @submit.prevent="addUser">
            <div class="mb-2">
                <label class="form-label">{{ $t("Username") }}</label>
                <input v-model="newUser.username" type="text" class="form-control" autocomplete="off" data-testid="new-username" required />
            </div>
            <div class="mb-2">
                <label class="form-label">{{ $t("Password") }}</label>
                <input v-model="newUser.password" type="password" class="form-control" autocomplete="new-password" data-testid="new-password" required />
            </div>
            <button type="submit" class="btn btn-primary" data-testid="add-user-button">{{ $t("Add User") }}</button>
        </form>

        <!-- Reset password inline (shown when a user is selected for reset) -->
        <div v-if="resetTarget" class="mt-4 p-3 shadow-box">
            <h5 class="mb-3">{{ $t("Reset Password") }}: {{ resetTarget.username }}</h5>
            <div class="mb-2">
                <label class="form-label">{{ $t("New Password") }}</label>
                <input v-model="resetPasswordValue" type="password" class="form-control" autocomplete="new-password" />
            </div>
            <button class="btn btn-primary me-2" @click="confirmReset">{{ $t("Save") }}</button>
            <button class="btn btn-normal" @click="cancelReset">{{ $t("Cancel") }}</button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            userList: [],
            currentPassword: "",
            newUser: {
                username: "",
                password: "",
            },
            resetTarget: null,
            resetPasswordValue: "",
        };
    },

    mounted() {
        this.loadUserList();
    },

    methods: {
        /**
         * Require the current password before any mutating action
         * @returns {boolean} Whether the current password has been entered
         */
        requireCurrentPassword() {
            if (!this.currentPassword) {
                this.$root.toastError(this.$t("currentPasswordRequired"));
                return false;
            }
            return true;
        },

        /**
         * Load the user list
         * @returns {void}
         */
        loadUserList() {
            this.$root.getSocket().emit("getUserList", (res) => {
                if (res.ok) {
                    this.userList = res.userList;
                } else {
                    this.$root.toastRes(res);
                }
            });
        },

        /**
         * Add a new admin user
         * @returns {void}
         */
        addUser() {
            if (!this.requireCurrentPassword()) {
                return;
            }
            this.$root.getSocket().emit("addUser", {
                username: this.newUser.username,
                password: this.newUser.password,
                currentPassword: this.currentPassword,
            }, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.newUser.username = "";
                    this.newUser.password = "";
                    this.loadUserList();
                }
            });
        },

        /**
         * Delete a user
         * @param {object} user The user to delete
         * @returns {void}
         */
        deleteUser(user) {
            if (!this.requireCurrentPassword()) {
                return;
            }
            this.$root.getSocket().emit("deleteUser", {
                userID: user.id,
                currentPassword: this.currentPassword,
            }, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadUserList();
                }
            });
        },

        /**
         * Toggle a user's active state
         * @param {object} user The user to toggle
         * @returns {void}
         */
        toggleActive(user) {
            if (!this.requireCurrentPassword()) {
                return;
            }
            this.$root.getSocket().emit("setUserActive", {
                userID: user.id,
                active: !user.active,
                currentPassword: this.currentPassword,
            }, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadUserList();
                }
            });
        },

        /**
         * Begin resetting a user's password
         * @param {object} user The user whose password to reset
         * @returns {void}
         */
        startReset(user) {
            this.resetTarget = user;
            this.resetPasswordValue = "";
        },

        /**
         * Cancel reset
         * @returns {void}
         */
        cancelReset() {
            this.resetTarget = null;
            this.resetPasswordValue = "";
        },

        /**
         * Confirm password reset
         * @returns {void}
         */
        confirmReset() {
            if (!this.requireCurrentPassword()) {
                return;
            }
            this.$root.getSocket().emit("resetUserPassword", {
                userID: this.resetTarget.id,
                newPassword: this.resetPasswordValue,
                currentPassword: this.currentPassword,
            }, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.cancelReset();
                }
            });
        },
    },
};
</script>
