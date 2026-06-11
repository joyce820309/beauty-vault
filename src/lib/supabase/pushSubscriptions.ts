import { supabase } from './client'

export async function savePushSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      p256dh: (json.keys as Record<string, string>).p256dh,
      auth: (json.keys as Record<string, string>).auth,
    },
    { onConflict: 'endpoint' }
  )
  return { error }
}

export async function deletePushSubscription(endpoint: string) {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  return { error }
}

export async function getMySubscription(endpoint: string) {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('endpoint')
    .eq('endpoint', endpoint)
    .maybeSingle()
  return data
}
