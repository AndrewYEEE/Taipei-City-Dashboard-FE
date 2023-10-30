<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component has two modes "expanded" and "collapsed" which is controlled by the prop "expanded" -->

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const props = defineProps({
	icon: { type: String },
	title: { type: String },
	index: { type: String },
	expanded: { type: Boolean }
});

const tabLink = computed(() => { //依據index預先建立URL 
	return `${route.path}?index=${props.index}`;
});
const linkActiveOrNot = computed(() => { //從route中獲取URL上現在的index，如果與現在props.index一樣，代表在同一頁，為true，進而改變以下css風格
	return route.query.index === props.index ? true : false;
});
</script>

<template>
	<router-link :to="tabLink" :class="{ sidebartab: true, 'sidebartab-active': linkActiveOrNot }">
		<span>{{ icon }}</span>
		<h3 v-if="expanded">{{ title }}</h3> <!--如果展開，顯示文字，否則只顯示圖片-->
	</router-link>
</template>

<style scoped lang="scss">
.sidebartab {
	max-height: var(--font-xl);
	display: flex;
	align-items: center;
	margin: var(--font-s) 0;
	border-left: solid 4px transparent;
	border-radius: 0 5px 5px 0;
	transition: background-color 0.2s;
	white-space: nowrap;

	&:hover {
		background-color: var(--color-component-background);
	}

	span {
		min-width: var(--font-l);
		margin-left: var(--font-s);
		font-family: var(--font-icon);
		font-size: calc(var(--font-m) * var(--font-to-icon));
	}

	h3 {
		margin-left: var(--font-s);
		font-size: var(--font-m);
		font-weight: 400;
	}

	&-active {
		border-left-color: var(--color-highlight);
		background-color: var(--color-component-background);

		span,
		h3 {
			color: var(--color-highlight);
		}
	}
}
</style>