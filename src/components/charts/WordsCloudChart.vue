<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMapStore } from '../../store/mapStore';

const props = defineProps(['chart_config', 'activeChart', 'series', 'map_config']);
const mapStore = useMapStore();

const limitNum = ref(12); //限制12個字

const getMaxValue = computed(()=>{
    const Org = [...props.series[0].data]; //先複製一份資料 (避免Call By Reference的缺陷)
    //獲取最大值
    let objMax = Org.reduce((max, curren) => max.y > curren.y ? max : curren);
    return objMax.y
})

const getWords = computed(()=>{
    const Org = [...props.series[0].data]; //先複製一份資料 (避免Call By Reference的缺陷)

    //排序
    let sortable = [];
    for (var key in Org) {
        sortable.push([key, Org[key]]);
    }

    sortable.sort(function(a, b) {
        return b[1].y - a[1].y ;
    });
    let toParse = {}
    console.log(sortable)
    sortable.forEach(function(item,index){
        toParse[index]=item[1]
    })
   
    
    //檢查長度
	if (toParse.length <= limitNum.value) {
		return toParse
	}
	let output = [];
	for (let i = 0; i < limitNum.value; i++) {
		output.push(toParse[i]);
	}
	return output;
});




function tranParams(item){
    const maxValue = getMaxValue.value
    const windowH = 550 
    const windowW = 413 /2
    const midx = windowW /2 
    const midy = windowH /2
    const x = midx+((Math.random() - 0.5) * 2)*(120 - 120 * (item.y/maxValue))
    const y = midy+((Math.random() - 0.5) * 2)*(120 - 120 * (item.y/maxValue))
    return `matrix(1 0 0 1 ${x} ${y})`
}

function getStyle(item){
    const s = Math.floor(Math.random() * item.y) + 15
    const c = {
        'font-size': s+'px',
        // 'fill': '#808080',
        'fill': randomColor(),
        'font-family': 'Open Sans',
        // 'color': randomColor()
    }
    return c
}

function randomColor() {
    return '#' + ('80800' + (Math.random() * 16777216 << 0).toString(16)).substr(-6);
}

function getAnime(index){
    const name =  "initial-animation-"+index
    let obj = {};
    obj[name] = true
    return obj
}

</script>

<template>
	<div v-if="activeChart === 'WordsCloudChart'" class="wordscloudchart">
        <div class="wordscloudchart-chart">
            <svg id="wordchart" viewBox="0 0 413 550" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <text v-for="item, index in getWords" 
                    :transform="tranParams(item)" 
                    :style="getStyle(item)" 
                    :key="`${item.x}-${item.y}`" 
                    :class="getAnime(index)">
                        {{item.x}}
                    </text> 
                </g>
            </svg>
        </div>
	</div>
</template>


<style scoped lang="scss">
.wordscloudchart {
	max-height: 100%;
 
	position: relative;
	overflow-y: scroll;

    &-title {
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: absolute;
		left: 0;
		top: 0;
		margin: 0.5rem 0 -0.5rem;

		h5 {
			color: var(--color-complement-text);
		}

		h6 {
			color: var(--color-complement-text);
			font-size: var(--font-m);
			font-weight: 400;
		}

		&-legend {
			display: flex;
			justify-content: space-between;

			div {
				position: relative;
				width: 3rem;
				margin: 0 4px;
				border-radius: 5px;
			}

			div:before {
				content: "";
				width: 3rem;
				height: var(--font-l);
				position: absolute;
				top: 0;
				left: 0;
				background: linear-gradient(270deg, rgba(40, 42, 44, 1), rgba(40, 42, 44, 0.2));
			}

			p {
				color: var(--color-complement-text)
			}
		}
	}

    &-chart {
		display: flex;
		justify-content: center;


		svg {
            width: 80%;
            text.blink {
                animation: blink 2s ease-out;
            }
        }
	}
}
.active-district {
	transform: translateY(-5px);
}

@keyframes ease-in {
	0% {
		opacity: 0
	}

	;

	100% {
		opacity: 1
	}
}

@for $i from 1 through 12 {
	.initial-animation-#{$i} {
		animation-name: ease-in;
		animation-duration: 1s;
		animation-delay: 0.05s * ($i - 1);
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}
}

</style>