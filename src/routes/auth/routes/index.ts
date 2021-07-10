import Express from "express";
const router = Express.Router();

import LoginHandler from "../Login";
import LogoutHandler from "../Logout";
import RegistrationHandler from "../Register";
import authenticate from "../../../middleware/authenticate";

router.use("/logout", LogoutHandler);
router.use("/login", authenticate(true), LoginHandler);
router.use("/register", authenticate(true), RegistrationHandler);

export default router;