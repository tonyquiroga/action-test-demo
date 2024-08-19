import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { I18nResolver } from './resolvers/i18n.resolver';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    resolve: [I18nResolver],
    runGuardsAndResolvers: 'always',
    // Component can be pre-loaded or lazily loaded, i18n will work in both cases.
    component: HomeComponent,
    // component: ShowcaseComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
