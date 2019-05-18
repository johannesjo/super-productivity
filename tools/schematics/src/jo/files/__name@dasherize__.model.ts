import { EntityState } from '@ngrx/entity';

export interface <%= classify(name)%>Copy {
    id: string;
}

export type <%= classify(name)%> = Readonly<<%= classify(name)%>Copy>;

export interface <%= classify(name)%>State extends EntityState<<%= classify(name)%>> {
    // additional entities state properties
}
