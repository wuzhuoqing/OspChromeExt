import React from 'react';
import { MPSyncStatus } from './modules/MemberHelper';

export default (props) => {
    switch (props.value) {
        case MPSyncStatus.InSync:
            return (<span><img src="src/assets/img/Checkmark.gif" alt={props.value} /></span>);
        case MPSyncStatus.NeedToAdd:
            return (<span><img src="src/assets/img/NewMember.gif" alt={props.value} /></span>);
        case MPSyncStatus.NeedToRenew:
            return (<span><img src="src/assets/img/RenewMember.gif" alt={props.value} /></span>);
        case MPSyncStatus.Extra:
            return (<span><img src="src/assets/img/DeletedMember.gif" alt={props.value} /></span>);
        case MPSyncStatus.Duplicate:
            return (<span><img src="src/assets/img/DuplicatePerson.gif" alt={props.value} /></span>);
        default:
            return (<span><img src="src/assets/img/Question.gif" alt={props.value} /></span>);
    }

}