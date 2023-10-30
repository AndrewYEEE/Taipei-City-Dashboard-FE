<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component has two modes "success" and "fail". The modes are controlled via the mapStore -->

<script setup>
import { useDialogStore } from '../../store/dialogStore';

const dialogStore = useDialogStore();

const statusToIcon = {
	success: 'check_circle',
	fail: 'error',
	info: 'lightbulb'
};
</script>

<template>
	<Teleport to="body"> <!--將一個元件內部的模板「傳送」到DOM 結構外層，這類場景最常見的例子就是全螢幕的模態框。-->
		<Transition name="notification"> <!--元素或元件進入和離開DOM 時套用動畫，name用於識別所屬的css，看最下面-->
			<div class="notificationcontainer" v-if="dialogStore.dialogs.notificationBar"> <!--如果notificationBar是true，則渲染以下內容-->
				<div class="notificationcontainer-notification">
					<span
						:class="{ success: dialogStore.notification.status === 'success', fail: dialogStore.notification.status === 'fail', info: dialogStore.notification.status === 'info' }">{{
							statusToIcon[dialogStore.notification.status] }}</span>
					<h5
						:class="{ success: dialogStore.notification.status === 'success', fail: dialogStore.notification.status === 'fail', info: dialogStore.notification.status === 'info' }">
						{{ dialogStore.notification.message }}</h5>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped lang="scss">
.notificationcontainer {
	width: 100vw;
	display: flex;
	justify-content: center;
	position: fixed;
	top: 20px;
	padding-bottom: 1rem;

	&-notification {
		height: 3rem;
		width: fit-content;
		display: flex;
		align-items: center;
		padding: 0 1rem;
		border: solid 1px var(--color-border);
		border-radius: 5px;
		box-shadow: 0px 5px 10px black;
		background-color: rgb(63, 63, 63);

		span {
			margin-right: 10px;
			font-family: var(--font-icon);
			font-size: var(--font-l);
		}

		h5 {
			font-weight: 400;
		}
	}
}

.success {
	color: greenyellow;
}

.fail {
	color: rgb(237, 90, 90);
}

.info {
	color: var(--color-highlight)
}

// Classes that are provided by vue transitions. Read the official docs for more instructions.
// https://vuejs.org/guide/built-ins/transition.html
.notification-enter-from,
.notification-leave-to {
	top: -60px;
}

.notification-enter-active,
.notification-leave-active {
	transition: top 0.3s ease;
}
</style>