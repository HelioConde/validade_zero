import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import PushSettings from './PushSettings';
import * as client from '../push/client';
jest.mock('../push/client',()=>({
 pushSupported:jest.fn(()=>true),
 enablePush:jest.fn(async()=>true),
 disablePush:jest.fn(async()=>{}),
 getPushStatus:jest.fn(async()=>({
   enabled:false,preferred_period:'auto',timezone:'America/Sao_Paulo',
   activity:[],period:'morning',schedule:'7h'
 }))
}));
const cloud={savePushPreferences:jest.fn(async()=>{})};
const user={id:'usuario-de-teste'};
beforeEach(()=>{
 jest.clearAllMocks();
 client.getPushStatus.mockResolvedValue({
   enabled:false,preferred_period:'auto',timezone:'America/Sao_Paulo',
   activity:[],period:'morning',schedule:'7h'
 });
 client.enablePush.mockResolvedValue(true);
 client.disablePush.mockResolvedValue();
 cloud.savePushPreferences.mockResolvedValue();
});
test('não pede permissão push antes do clique',async()=>{
 render(<PushSettings cloud={cloud} user={user}/>);
 await screen.findByText('7h',{selector:'strong'});
 expect(client.enablePush).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Ativar notificações push'})).toBeEnabled();
});
test('ativa push pelo clique e permite turno alternativo',async()=>{
 render(<PushSettings cloud={cloud} user={user}/>);
 await screen.findByText('7h',{selector:'strong'});
 fireEvent.click(screen.getByRole('button',{name:'Ativar notificações push'}));
 await waitFor(()=>expect(client.enablePush).toHaveBeenCalledWith(cloud,user.id));
 fireEvent.change(screen.getByLabelText('Preferência do horário de notificações'),{target:{value:'afternoon'}});
 await waitFor(()=>expect(cloud.savePushPreferences).toHaveBeenCalledWith({
  userId:user.id,enabled:false,timezone:'America/Sao_Paulo',preferred_period:'afternoon'
 }));
});
