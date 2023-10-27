// Cleaned

/* authStore */
/*
The authStore stores authentication and user information.
Since this template doesn't implement user authentication, only dummy user info is stored.
If you wish to implement authentication, you can reference the logic below (based on the authentication system of Taipei City Dashboard)
or design a new system from scratch that tailors to your needs. 
*/

import { defineStore } from "pinia"; //Pinia 是 Vue3 推出後，官方推薦使用的新狀態管理工具， 也是默認配置
import { useDialogStore } from "./dialogStore";

export const useAuthStore = defineStore("auth", { //auth是這個store的id
	state: () => ({ //這個store具體有哪些參數可以設
		// This is a shortened version of the user object Taipei City Dashboard's backend will return once authenticated
		user: {
			email: "tuic-admin@gov.taipei",
			gid: 1,
			id: 1,
			name: "儀表板測試者🤩",
			status: 1,
			type: 0,
		},
		tokens: {},
		errorMessage: "",
		isMobileDevice: false,
	}),
	getters: {},
	actions: { //Pinia 的 Actions 支援 async function，這是改變 State 的唯一方法
		// Call this function to log in
		handleLogin() {},

		// Call this function to log out (Currently just shows a 'cannot log out' notification)
		handleLogout() {
			const dialogStore = useDialogStore();
			dialogStore.showNotification(
				"fail",
				"尚未新增用戶管理功能，無法登出"
			);
		},

		// If your authentication system supports refresh tokens, call this function to refresh existing tokens
		executeRefreshTokens() {},

		// Call this function to store tokens in the store as well as in localstorage/cookies/etc.
		setTokens() {},

		// Call this function to store user info in the store
		setUser() {},

		// Call this function to clear the entire store
		executeClearStore() {},
		checkIfMobile() {
			if (navigator.maxTouchPoints > 2) { //自動讀取當前瀏覽器支援觸碰點個數
				this.isMobileDevice = true;
			}
			if (window.matchMedia("(pointer:fine)").matches) { 
				//檢查當前視窗是否支援查詢語句內容
				/*
					if ( window.matchMedia("(max-width: 700px)").matches ) { 
						視窗小於或等於700 像素
					} else { 
						視窗大於700 像素
					}  
				 */
				this.isMobileDevice = false;
			}
		},
	},
});
