export async function uploadImage(campaignId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await $fetch<{ url: string }>(`/api/campaigns/${campaignId}/images`, {
    method: 'POST',
    body: formData,
  })
  return res.url
}
