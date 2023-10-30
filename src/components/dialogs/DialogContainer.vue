<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component is the template for most dialogs. It will show a dialog centered in the middle of the screen with the rest of the application blurred out -->
<!-- The "dialog" prop defines the target dialog to control whether it is shown, the "onClose" emit allows for a closing function to be passed in  -->

<script setup>
import { useDialogStore } from '../../store/dialogStore';

const dialogStore = useDialogStore();

defineProps({ dialog: String }); //獲取dialog prop
defineEmits(['onClose']); //指定自訂義事件on-Close
</script>

<template>
	<Teleport to="body"> <!--將一個元件內部的模板「傳送」到DOM 結構外層，這類場景最常見的例子就是全螢幕的模態框。-->
		<Transition name="dialog"> <!--元素或元件進入和離開DOM 時套用動畫，name用於識別所屬的css，看最下面-->
			<div class="dialogcontainer" v-if="dialogStore.dialogs[dialog]">
				<div class="dialogcontainer-background" @click="$emit('onClose')"></div> <!--用v-on監控背景點擊事件，透過$emit觸發自訂事件onClose-->
				<div class="dialogcontainer-dialog">
					<slot></slot> <!--呼叫此元件的父元件，中間的內容會插入在這-->
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped lang="scss">
.dialogcontainer {
	width: 100vw;
	height: 100vh;
	height: calc(var(--vh) * 100);
	display: flex;
	align-items: center;
	justify-content: center;
	position: fixed;
	top: 0;
	left: 0;
	opacity: 1;
	z-index: 10;

	&-background {
		width: 100vw;
		height: 100vh;
		height: calc(var(--vh) * 100);
		position: absolute;
		top: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.66);
	}

	&-dialog {
		width: fit-content;
		height: fit-content;
		position: relative;
		padding: var(--font-m);
		border: solid 1px var(--color-border);
		border-radius: 5px;
		background-color: var(--color-component-background);
		transform: translateY(0);
		z-index: 2;
	}
}

// Classes that are provided by vue transitions. Read the official docs for more instructions.
// https://vuejs.org/guide/built-ins/transition.html
.dialog-enter-from,
.dialog-leave-to {
	opacity: 0;

	.dialogcontainer-dialog {
		transform: translateY(-2.25rem);
	}
}

.dialog-enter-active,
.dialog-leave-active {
	transition: opacity 0.3s ease;

	.dialogcontainer-dialog {
		transition: transform 0.3s ease;
	}
}
</style>