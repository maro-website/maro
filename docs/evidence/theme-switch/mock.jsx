import React from 'react';
const Auth = React.createContext(null);
export function FixtureProvider({children}) {
  const [id,setId]=React.useState(()=>localStorage.getItem('theme.qa.account')||'user-a');
  const choose=next=>{localStorage.setItem('theme.qa.account',next);setId(next);};
  return <Auth.Provider value={{ready:true,user:{id,name:'Theme QA '+id,email:id+'@example.invalid'},isAdmin:false,signOut:async()=>{},updateAvatar:async()=>({})}}>
    <div className="mb-8 flex gap-3"><button className="rounded-maro12 bg-surface px-4 py-3" onClick={()=>choose('user-a')}>Account A</button><button className="rounded-maro12 bg-surface px-4 py-3" onClick={()=>choose('user-b')}>Account B</button></div>{children}
  </Auth.Provider>;
}
export function useMaro(){return React.useContext(Auth);}
export function useRouter(){return {push:()=>{}};}
export function useToast(){return {toast:()=>{}};}
export function AvatarCropper(){return null;}
export async function getAccessToken(){return null;}
export default function Link({children,...props}){return <a {...props}>{children}</a>;}
