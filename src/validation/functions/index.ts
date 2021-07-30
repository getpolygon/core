import { sql } from "slonik";
import { User } from "../../types";
import slonik from "../../db/slonik";
import emailValidator from "deep-email-validator-extended";

// Middleware function for express-validator for validating user emails
export const validateEmail = async (value: string) => {
  // Checking if the email is really valid
  const { valid } = await emailValidator({
    email: value,
    validateMx: true,
    validateTypo: true,
    validateRegex: true,
    validateSMTP: false,
    validateMxTimeout: 500,
    validateDisposable: true,
  });

  // If the email is valid
  if (valid) {
    // Checking for existing users with that email
    const existingUser = await slonik.maybeOne(sql<User>`
      SELECT * FROM users WHERE email = ${value};
    `);

    // If there is no user with that email
    if (!existingUser) return Promise.resolve(valid);
    // If there is a user with that email
    else return Promise.reject("Email is taken");
  }
  // If it's invalid
  else return Promise.reject("Invalid email");
};

// Middleware function for express-validator for validating user usernames
export const validateUsername = async (value: string) => {
  // Validating the username by regex
  const validRegex = /^[a-z0-9_\.]+$/.test(value);

  // If the regex isn't valid
  if (!validRegex) return Promise.reject("Invalid username");
  else {
    // Finding another user with the same username if it exists
    const existingUser = await slonik.maybeOne(sql<User>`
      SELECT * FROM users WHERE username = ${value};
    `);

    // If there are no accounts with that username, make the field valid
    if (!existingUser) return Promise.resolve(validRegex);
    else return Promise.reject("Username is taken");
  }
};