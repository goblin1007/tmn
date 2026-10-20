import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Contract, LeaseConditionDraft } from '../../types';
import {
  FileText, Sliders, Edit3, Send, FileCheck, Calendar, RotateCcw,
  Sparkles, Layers, CheckCircle2, ShieldCheck, Calculator
} from 'lucide-react';
import { HDT01LeaseConditions } from './contracts/HDT01LeaseConditions';
import { HDT02DraftContract } from './contracts/HDT02DraftContract';
import { HDT03SendAndNegotiate } from './contracts/HDT03SendAndNegotiate';
import { HDT04ReceiveSignedContract } from './contracts/HDT04ReceiveSignedContract';
import { HDT05BatchSchedules } from './contracts/HDT05BatchSchedules';
import { HDT05ContractExpiry } from './contracts/HDT05ContractExpiry';
import { HDT06RenewalContract } from './contracts/HDT06RenewalContract';
import { DepositSettlementView } from './DepositSettlementView';
import { HDT07ActivateRenewal } from './contracts/HDT07ActivateRenewal';

export type ContractTabKey =
  | 'overview'
  | 'settlement'
  | 'conditions'
  | 'draft'
  | 'negotiate'
  | 'sign'
  | 'expiry'
  | 'schedules'
  | 'renewal'
  | 'activate';

export const ContractsView: React.FC<{initialContractId?: string; onBackToRooms?: (roomCode: string) => void}> = ({initialContractId, onBackToRooms}) => {
  const {
    contracts,
    leaseConditions,
    batchSchedules,
    settlementSlips,
    initialPaymentRecords,
    returnInspections
  } = useApp();

  const [activeTab, setActiveTab] = useState<ContractTabKey>('overview');

  const [selectedContractId, setSelectedContractId] = useState(initialContractId || '');
  const [searchContract, setSearchContract] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'needs'>('all');
  const [settlementScope, setSettlementScope] = useState<'all' | 'contract'>('all');
  const [settlementInitialAction, setSettlementInitialAction] = useState<'manage' | 'create' | 'edit' | 'result' | 'view'>('manage');
  const [settlementTargetSlipId, setSettlementTargetSlipId] = useState('');
  const [settlementTargetRoomCode, setSettlementTargetRoomCode] = useState('');
  useEffect(() => { if (initialContractId) {setSelectedContractId(initialContractId); setActiveTab('overview');} }, [initialContractId]);
  const selectedContract = contracts.find(c => c.id === selectedContractId);
  const hasReturnForContract = (contract: Contract) => returnInspections.some(i => i.leaseId === contract.leaseId && i.roomCode === contract.roomCode && i.step304Status === 'Đã nhận lại' && i.step305Confirmed);
  const hasSuccessorContract = (contract: Contract) => contracts.some(c => c.previousContractId === contract.id);
  const isSettlementComplete = (contract: Contract) => settlementSlips.some(s => s.leaseId === contract.leaseId && s.roomCode === contract.roomCode && (s.status === 'Hoàn tất' || s.step58Published));
  const needsSettlementForContract = (contract: Contract) => !hasSuccessorContract(contract) && contract.status !== 'Đã hủy' && hasReturnForContract(contract) && !isSettlementComplete(contract);
  const contractList = contracts.filter(c => {
    const matchesSearch = [c.id, c.roomCode, c.tenantName].join(' ').toLowerCase().includes(searchContract.toLowerCase());
    return matchesSearch && (settlementFilter === 'all' || needsSettlementForContract(c));
  });
  useEffect(() => {
    if (selectedContractId && !contractList.some(c => c.id === selectedContractId)) {
      setSelectedContractId(contractList[0]?.id || '');
    }
  }, [selectedContractId, settlementFilter, searchContract, contracts, returnInspections, settlementSlips]);
  const linkedSlips = settlementSlips.filter(s => s.leaseId === selectedContract?.leaseId && s.roomCode === selectedContract?.roomCode);
  const currentSlip = linkedSlips.filter(s => s.status !== 'Đã hủy').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
  const firstPayment = initialPaymentRecords.find(r => r.leaseId === selectedContract?.leaseId);
  const hasReturnConfirmation = selectedContract ? hasReturnForContract(selectedContract) && !hasSuccessorContract(selectedContract) && selectedContract.status !== 'Đã hủy' : false;

  const openSettlement = (action: 'manage' | 'create' | 'edit' | 'result' | 'view', scope: 'all' | 'contract' = 'all') => {
    setSettlementScope(scope);
    setSettlementInitialAction(action);
    setSettlementTargetSlipId(scope === 'contract' ? (currentSlip?.id || '') : '');
    setSettlementTargetRoomCode(scope === 'contract' && selectedContract ? selectedContract.roomCode : '');
    setActiveTab('settlement');
  };
  // Inter-tab State
  const [selectedConditionForDraft, setSelectedConditionForDraft] = useState<LeaseConditionDraft | null>(null);
  const [selectedContractForSign, setSelectedContractForSign] = useState<Contract | null>(null);

  const handleNavigateToTab = (tab: ContractTabKey) => {
    setActiveTab(tab);
  };

  const handleSelectConditionForDraft = (condition: LeaseConditionDraft) => {
    setSelectedConditionForDraft(condition);
    setActiveTab('draft');
  };

  const handleSelectContractForSign = (contract: Contract) => {
    setSelectedContractForSign(contract);
    setActiveTab('sign');
  };

  // Counts for Badges
  const conditionsCount = leaseConditions.length;
  const draftOrNegotiatingCount = contracts.filter(c => c.status === 'Nháp' || c.status === 'Chờ khách ký').length;
  const renewalCount = contracts.filter(c => c.contractType === 'Hợp đồng nối tiếp').length;

  return (
    <div className="space-y-6">
      {/* Màn hình mặc định theo biên bản: danh sách hợp đồng trước, chi tiết sau */}
      {activeTab === 'overview' && <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h1 className="font-bold text-lg text-slate-900">Danh sách hợp đồng</h1>
          <p className="text-xs text-slate-500 mt-1">Chọn hợp đồng để xem chi tiết, gia hạn hoặc quyết toán cọc theo điều kiện.</p>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <input value={searchContract} onChange={e=>setSearchContract(e.target.value)} placeholder="Tìm mã hợp đồng, phòng hoặc khách thuê" className="w-full sm:w-auto sm:flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={()=>setActiveTab('schedules')} className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Lịch hợp đồng chung</button>
            <button onClick={()=>setActiveTab('expiry')} className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Theo dõi hạn hợp đồng</button>
            <button onClick={()=>openSettlement('manage', 'all')} className="px-3 py-2 border border-indigo-200 bg-indigo-50 text-indigo-800 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Calculator className="w-4 h-4 inline mr-1"/>Quản lý quyết toán cọc</button>
            <button onClick={()=>setActiveTab('conditions')} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">+ Lập hợp đồng</button>
            <select value={settlementFilter} onChange={e=>setSettlementFilter(e.target.value as 'all' | 'needs')} aria-label="Lọc hợp đồng theo tình trạng quyết toán cọc" className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="all">Tất cả hợp đồng</option>
              <option value="needs">Cần hoàn tất quyết toán cọc</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border p-3 space-y-2 max-h-[650px] overflow-y-auto">
            {contractList.map(c=><button key={c.id} onClick={()=>setSelectedContractId(c.id)} className={`w-full text-left p-3 border rounded-lg text-sm ${c.id===selectedContractId?'bg-blue-50 border-blue-500':'hover:bg-slate-50 border-slate-200'}`}>
              <strong>{c.id}</strong> · {c.roomCode}<div className="text-xs text-slate-600 mt-1">{c.tenantName}</div><div className="text-xs text-slate-500">{c.startDate} → {c.endDate} · {c.status}</div>
              {needsSettlementForContract(c) && <span className="inline-block mt-2 rounded bg-amber-100 text-amber-800 px-2 py-1 text-xs font-semibold">Cần hoàn tất quyết toán cọc</span>}
            </button>)}
            {contractList.length===0 && <p className="text-sm text-slate-500">{settlementFilter === 'needs' ? 'Không có hợp đồng nào cần hoàn tất quyết toán cọc.' : 'Chưa có hợp đồng phù hợp.'}</p>}
          </div>
          <div className="lg:col-span-3 bg-white rounded-xl border p-4 space-y-4">
            {!selectedContract ? <p className="text-sm text-slate-500">Chọn một hợp đồng trong danh sách để xem chi tiết.</p> : <>
              <h2 className="font-bold text-base">Chi tiết hợp đồng {selectedContract.id}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <p><span className="text-slate-500">Phòng:</span> {selectedContract.roomCode}</p>
                <p><span className="text-slate-500">Khách thuê:</span> {selectedContract.tenantName}</p>
                <p><span className="text-slate-500">Lần thuê:</span> {selectedContract.leaseId}</p>
                <p><span className="text-slate-500">Trạng thái:</span> {selectedContract.status}</p>
                <p><span className="text-slate-500">Từ ngày:</span> {selectedContract.startDate}</p>
                <p><span className="text-slate-500">Đến ngày:</span> {selectedContract.endDate}</p>
                <p><span className="text-slate-500">Tiền thuê:</span> {selectedContract.monthlyRent.toLocaleString('vi-VN')}đ/tháng</p>
                <p><span className="text-slate-500">Cọc gốc đã xác nhận:</span> {firstPayment ? `${firstPayment.depositAmount.toLocaleString('vi-VN')}đ` : 'Chưa có chứng cứ thanh toán ban đầu'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                <h3 className="font-semibold text-sm">Quyết toán cọc</h3>
                <p className="text-xs text-slate-600">Tình trạng: {currentSlip ? (currentSlip.status === 'Hoàn tất' || currentSlip.step58Published ? 'Đã quyết toán cọc' : 'Cần hoàn tất quyết toán cọc') : hasReturnConfirmation ? 'Chưa lập phiếu — cần xử lý' : 'Chưa đủ điều kiện nhận lại phòng'}</p>
                {hasReturnConfirmation && !isSettlementComplete(selectedContract) && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">Phòng đã được nhận lại. Cần hoàn tất quyết toán cọc để khép lại hồ sơ lần thuê này.</p>}
                {hasReturnConfirmation && !currentSlip && <button className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white" onClick={()=>openSettlement('create', 'contract')}>Lập quyết toán cọc</button>}
                {hasReturnConfirmation && currentSlip && !isSettlementComplete(selectedContract) && <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white" onClick={()=>openSettlement('edit', 'contract')}>Sửa</button>
                  {currentSlip.status === 'Khách đồng ý' && !currentSlip.reviewRequired && !currentSlip.step58Published && <button className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white" onClick={()=>openSettlement('result', 'contract')}>Ghi nhận kết quả quyết toán</button>}
                </div>}
                {currentSlip && isSettlementComplete(selectedContract) && <button className="px-3 py-2 text-sm rounded-lg border border-slate-300" onClick={()=>openSettlement('view', 'contract')}>Xem phiếu quyết toán</button>}
                {!hasReturnConfirmation && <p className="text-xs text-amber-700">Cần xác nhận nhận lại phòng thực tế trước khi lập phiếu.</p>}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {onBackToRooms && <button onClick={()=>onBackToRooms(selectedContract.roomCode)} className="px-3 py-2 rounded-lg border">Xem phòng</button>}
                {selectedContract.status==='Nháp' && <button onClick={()=>setActiveTab('negotiate')} className="px-3 py-2 rounded-lg border">Điều chỉnh dự thảo</button>}
                {['Nháp','Chờ khách ký'].includes(selectedContract.status) && <button onClick={()=>handleSelectContractForSign(selectedContract)} className="px-3 py-2 rounded-lg border">Ghi nhận ký</button>}
                {['Hiệu lực','Đã ký','Chờ hiệu lực'].includes(selectedContract.status) && <button onClick={()=>setActiveTab('renewal')} className="px-3 py-2 rounded-lg border">Lập hợp đồng nối tiếp</button>}
              </div>
            </>}
          </div>
        </div>
      </div>}
      {activeTab === 'settlement' && <div className="space-y-3">
        <button onClick={()=>setActiveTab('overview')} className="px-3 py-2 border rounded-lg text-sm bg-white">← {settlementScope === 'contract' ? 'Quay lại Chi tiết hợp đồng' : 'Quay lại Danh sách hợp đồng'}</button>
        <DepositSettlementView
          leaseId={settlementScope === 'contract' ? selectedContract?.leaseId : undefined}
          initialAction={settlementInitialAction}
          initialSlipId={settlementTargetSlipId || undefined}
          initialRoomCode={settlementTargetRoomCode || undefined}
        />
      </div>}
      {/* Action screens are contextual. The page no longer exposes every UC as a navigation tab. */}
      {activeTab !== 'overview' && activeTab !== 'settlement' && <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-700">Quản lý hợp đồng</p>
          <h1 className="font-bold text-lg">{{conditions:'Ghi nhận điều kiện thuê đã thống nhất',draft:'Lập dự thảo hợp đồng',negotiate:'Điều chỉnh dự thảo',sign:'Ghi nhận hợp đồng đã ký',expiry:'Theo dõi hạn hợp đồng',schedules:'Lịch đợt hợp đồng chung',renewal:'Lập hợp đồng nối tiếp',activate:'Ghi nhận ký hợp đồng nối tiếp'}[activeTab]}</h1>
        </div>
        <button onClick={()=>setActiveTab('overview')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">← Danh sách hợp đồng</button>
      </div>}
      {activeTab === 'expiry' && <HDT05ContractExpiry onSelectContract={(id)=>{setSelectedContractId(id);setActiveTab('overview');}}/>}
      {/* Tab Panels */}
      <div>
        {activeTab === 'conditions' && (
          <HDT01LeaseConditions
            onNavigateToTab={handleNavigateToTab}
            onSelectConditionForDraft={handleSelectConditionForDraft}
          />
        )}

        {activeTab === 'draft' && (
          <HDT02DraftContract
            initialCondition={selectedConditionForDraft}
            onNavigateToTab={handleNavigateToTab}
            onContractCreated={() => {
              setSelectedConditionForDraft(null);
            }}
          />
        )}

        {activeTab === 'negotiate' && (
          <HDT03SendAndNegotiate
            onNavigateToTab={handleNavigateToTab}
            onSelectContractForSign={handleSelectContractForSign}
          />
        )}

        {activeTab === 'sign' && (
          <HDT04ReceiveSignedContract
            initialContract={selectedContractForSign}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === 'schedules' && (
          <HDT05BatchSchedules />
        )}

        {activeTab === 'renewal' && (
          <HDT06RenewalContract
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === 'activate' && (
          <HDT07ActivateRenewal />
        )}
      </div>
    </div>
  );
};
