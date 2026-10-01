<template>
  <el-dialog v-model="open" title="生成分享图" width="min(720px,94vw)" class="picker-dialog" append-to-body @opened="generate">
    <div class="share-formats" aria-label="分享图内容"><el-button :type="!full ? 'primary' : 'default'" :disabled="busy" @click="full=false; generate()">属性名片</el-button><el-button :type="full ? 'primary' : 'default'" :disabled="busy" @click="full=true; generate()">装备详录</el-button></div>
    <div class="share-toolbar"><el-input v-model="title" placeholder="配装名称" maxlength="30" aria-label="分享图标题" /><el-button :loading="busy" @click="generate">重新生成</el-button></div>
    <div class="share-preview"><p v-if="busy">正在绘制配装简报…</p><p v-if="error" role="alert">{{ error }}</p><img v-if="imageUrl" :src="imageUrl" :alt="full ? '包含战斗属性、心法套装和八件装备的配装详录' : '包含战斗属性和心法套装的配装名片'" /></div>
    <div class="render-stage" aria-hidden="true"><ShareCard v-if="snapshot" ref="card" :config="snapshot" :title="title" :full="full" /></div>
    <template #footer><el-button @click="open=false">关闭</el-button><el-button type="primary" :disabled="!imageUrl || busy" @click="download">下载图片</el-button></template>
  </el-dialog>
</template>
<script setup>
import { ref, nextTick, watch, onBeforeUnmount } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { usePlansStore } from '../stores/plans.js'
import ShareCard from './ShareCard.vue'
const open=defineModel({type:Boolean}), store=useSimulatorStore(), plans=usePlansStore()
const full=ref(false), title=ref(''), snapshot=ref(null), card=ref(null), imageUrl=ref(''), busy=ref(false), error=ref('')
watch(open,value=>{if(value){title.value=plans.active?.name || `${store.流派}${store.变体}配装`;snapshot.value=JSON.parse(JSON.stringify(store.$state));error.value=''; if(imageUrl.value) URL.revokeObjectURL(imageUrl.value); imageUrl.value=''}})
async function generate(){
  if(busy.value || !snapshot.value)return
  busy.value=true;error.value=''
  try{await nextTick();await document.fonts.ready;const {default:html2canvas}=await import('html2canvas');const canvas=await html2canvas(card.value.$el,{scale:2,backgroundColor:'#f4eedd',logging:false});const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('图片生成失败');if(imageUrl.value)URL.revokeObjectURL(imageUrl.value);imageUrl.value=URL.createObjectURL(blob)}catch(e){error.value=e.message}finally{busy.value=false}
}
function download(){const a=document.createElement('a');a.href=imageUrl.value;a.download=`燕云配装-${title.value || '分享'}.png`;a.click()}
onBeforeUnmount(()=>{if(imageUrl.value)URL.revokeObjectURL(imageUrl.value)})
</script>
<style scoped>
.share-toolbar{display:flex;gap:10px;margin-bottom:16px}.share-preview{min-height:80px;text-align:center;color:var(--muted)}.share-preview img{display:block;width:100%;height:auto;border-radius:4px}.render-stage{position:fixed;left:-10000px;top:0;width:720px;pointer-events:none}
.share-formats{display:flex;gap:8px;margin-bottom:12px}.share-formats .el-button{margin:0}
</style>
