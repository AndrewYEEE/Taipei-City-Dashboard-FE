<!-- Developed By Taipei Urban Intelligence Center 2023 -->
<!-- 
Lead Developer:  Igor Ho (FE Engineer)
Data Pipelines:  Iima Yu (Data Scientist)
Design and UX: Roy Lin (Fmr. Consultant), Chu Chen (Researcher)
Systems: Ann Shih (Systems Engineer)
Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern) 
-->
<!-- Department of Information Technology, Taipei City Government -->

<script setup>
//以下是JS檔 (全域變數、Func處理用)
import { onBeforeMount, onMounted } from 'vue';
import { useAuthStore } from './store/authStore';
import { useDialogStore } from './store/dialogStore';

//以下是Vue檔 (VUE邏輯處裡)
import NavBar from './components/NavBar.vue';
import SideBar from './components/SideBar.vue';
import SettingsBar from './components/SettingsBar.vue';
import NotificationBar from './components/dialogs/NotificationBar.vue';
import InitialWarning from './components/dialogs/InitialWarning.vue';

const authStore = useAuthStore();
const dialogStore = useDialogStore();

onBeforeMount(() => {
	authStore.setUser();
	authStore.checkIfMobile();

	let vh = window.innerHeight * 0.01;
	document.documentElement.style.setProperty('--vh', `${vh}px`);

	window.addEventListener('resize', () => {
		let vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty('--vh', `${vh}px`);
	});
});
onMounted(() => {
	const showInitialWarning = localStorage.getItem('initialWarning'); //從瀏覽器本地儲存中找尋initialWarning變數
	if (!showInitialWarning) {
		dialogStore.showDialog('initialWarning'); //沒有的話，就針對dialogStore這個store的showDialog這個action設定initialWarning要show
	}
});
</script>

<template>
	<div class="app-container">
		<NotificationBar />
		<NavBar />
		<div class="app-content">
			<SideBar />
			<div class="app-content-main">
				<SettingsBar />
				<RouterView></RouterView> <!--正中間畫面顯示方式邏輯-->
			</div>
		</div>
		<InitialWarning /> <!--剛啟動時的跳出畫面-->
	</div>
</template>

<style scoped lang="scss">
.app {
	&-container {
		max-width: 100vw;
		max-height: 100vh;
		max-height: calc(var(--vh) * 100);
	}

	&-content {
		width: 100vw;
		max-width: 100vw;
		height: calc(100vh - 60px);
		height: calc(var(--vh) * 100 - 60px);
		display: flex;

		&-main {
			width: 100%;
			display: flex;
			flex-direction: column;
		}
	}
}
</style>