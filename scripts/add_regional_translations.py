#!/usr/bin/env python3
"""Add missing regional.panel.* translation keys to LanguageContext.tsx."""
import re

FILE = '/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# Add new key to EN
content = content.replace(
    '    "regional.panel.announcementError": "Error saving announcement",',
    '    "regional.panel.announcementError": "Error saving announcement",\n    "regional.panel.createdOn": "Created on",'
)

# Add new key to PT
content = content.replace(
    '    "regional.panel.announcementError": "Erro ao salvar an\u00fancio",',
    '    "regional.panel.announcementError": "Erro ao salvar an\u00fancio",\n    "regional.panel.createdOn": "Criado em",'
)

ptbr_block = '''    "regional.title": "Gestor Regional",
    "regional.dashboard": "Painel Regional",
    "regional.managers": "Gestores",
    "regional.addManager": "Adicionar Gestor",
    "regional.removeManager": "Remover Gestor",
    "regional.regions": "Regi\u00f5es",
    "regional.regionsList": "Lista de Regi\u00f5es",
    "regional.editRegion": "Editar Regi\u00e3o",
    "regional.createRegion": "Criar Regi\u00e3o",
    "regional.stats": "Estat\u00edsticas",
    "regional.revenue": "Receita",
    "regional.users": "Usu\u00e1rios",
    "regional.activeLives": "Lives Ativas",
    "regional.totalGames": "Total de Jogos",
    "regional.performance": "Desempenho",
    "regional.topRegions": "Top Regi\u00f5es",
    "regional.managerName": "Nome do Gestor",
    "regional.managerEmail": "Email do Gestor",
    "regional.assignedRegions": "Regi\u00f5es Atribu\u00eddas",
    "regional.noManagers": "Nenhum gestor ainda",
    "regional.confirmRemove": "Tem certeza de que deseja remover este gestor?",
    "regional.save": "Salvar",
    "regional.cancel": "Cancelar",
    "regional.name": "Nome",
    "regional.description": "Descri\u00e7\u00e3o",
    "regional.country": "Pa\u00eds",
    "regional.currency": "Moeda",
    "regional.language": "Idioma",
    "regional.panel.title": "Painel do Gestor Regional",
    "regional.panel.manageIndependently": "Gerencie sua regi\u00e3o de forma independente",
    "regional.panel.seniorManager": "Gestor S\u00eanior",
    "regional.panel.regionalManager": "Gestor Regional",
    "regional.panel.regionCount": "{count} regi\u00e3o(\u00f5es)",
    "regional.panel.refresh": "Atualizar",
    "regional.panel.branding": "Branding",
    "regional.panel.settings": "Configura\u00e7\u00f5es",
    "regional.panel.nativeGames": "Jogos Nativos",
    "regional.panel.announcements": "Comunicados",
    "regional.panel.visualIdentity": "Identidade Visual da Regi\u00e3o",
    "regional.panel.primaryColor": "Cor Prim\u00e1ria",
    "regional.panel.secondaryColor": "Cor Secund\u00e1ria",
    "regional.panel.accentColor": "Cor de Destaque",
    "regional.panel.themeName": "Nome do Tema",
    "regional.panel.logoUrl": "URL do Logo",
    "regional.panel.bannerUrl": "URL do Banner",
    "regional.panel.saveBranding": "Salvar Branding",
    "regional.panel.saving": "Salvando...",
    "regional.panel.brandingSaved": "Branding atualizado com sucesso!",
    "regional.panel.brandingError": "Erro ao salvar branding",
    "regional.panel.regionSettings": "Configura\u00e7\u00f5es da Regi\u00e3o",
    "regional.panel.spinWheel": "Roleta de Pr\u00eamios",
    "regional.panel.spinWheelDesc": "Permitir roleta de pr\u00eamios personalizada",
    "regional.panel.millionaire": "Quem Quer Ser Milion\u00e1rio",
    "regional.panel.millionaireDesc": "Jogo de perguntas com pr\u00eamios",
    "regional.panel.challengeGames": "Jogos de Desafio",
    "regional.panel.challengeGamesDesc": "Desafios entre usu\u00e1rios",
    "regional.panel.liveGames": "Jogos ao Vivo",
    "regional.panel.liveGamesDesc": "Lives interativas com jogos",
    "regional.panel.maintenanceMode": "Modo de Manuten\u00e7\u00e3o",
    "regional.panel.maintenanceDesc": "Desativar temporariamente a regi\u00e3o para usu\u00e1rios",
    "regional.panel.saveSettings": "Salvar Configura\u00e7\u00f5es",
    "regional.panel.settingsSaved": "Configura\u00e7\u00f5es salvas!",
    "regional.panel.settingsError": "Erro ao salvar configura\u00e7\u00f5es",
    "regional.panel.nativeGamesTitle": "Jogos Nativos da Regi\u00e3o",
    "regional.panel.nativeGamesDesc": "Crie e gerencie jogos exclusivos para sua regi\u00e3o",
    "regional.panel.createGame": "Criar Jogo",
    "regional.panel.gameCreated": "Jogo criado! Configure abaixo.",
    "regional.panel.gameCreateError": "Erro ao criar jogo",
    "regional.panel.noGames": "Nenhum jogo nativo criado ainda.",
    "regional.panel.noGamesHint": "Clique em Criar Jogo para come\u00e7ar.",
    "regional.panel.active": "Ativo",
    "regional.panel.inactive": "Inativo",
    "regional.panel.configure": "Configurar",
    "regional.panel.editorDev": "Editor de jogo em desenvolvimento",
    "regional.panel.previewDev": "Visualiza\u00e7\u00e3o em desenvolvimento",
    "regional.panel.newGame": "Novo Jogo {count}",
    "regional.panel.announcementTitle": "Comunicado Regional",
    "regional.panel.announcementActive": "Comunicado ativo",
    "regional.panel.announcementActiveDesc": "Mostrar banner de comunicado no topo da p\u00e1gina",
    "regional.panel.announcementText": "Texto do Comunicado",
    "regional.panel.announcementSaved": "Comunicado atualizado!",
    "regional.panel.announcementError": "Erro ao salvar comunicado",
    "regional.panel.ctaLabel": "Texto do Bot\u00e3o CTA",
    "regional.panel.ctaUrl": "URL do CTA",
    "regional.panel.saveAnnouncement": "Salvar Comunicado",
    "regional.panel.createdOn": "Criado em",
'''

es_block = '''    "regional.panel.title": "Panel del Gestor Regional",
    "regional.panel.manageIndependently": "Gestiona tu regi\u00f3n de forma independiente",
    "regional.panel.seniorManager": "Gestor Senior",
    "regional.panel.regionalManager": "Gestor Regional",
    "regional.panel.regionCount": "{count} regi\u00f3n(es)",
    "regional.panel.refresh": "Actualizar",
    "regional.panel.branding": "Branding",
    "regional.panel.settings": "Configuraci\u00f3n",
    "regional.panel.nativeGames": "Juegos Nativos",
    "regional.panel.announcements": "Anuncios",
    "regional.panel.visualIdentity": "Identidad Visual de la Regi\u00f3n",
    "regional.panel.primaryColor": "Color Primario",
    "regional.panel.secondaryColor": "Color Secundario",
    "regional.panel.accentColor": "Color de Acento",
    "regional.panel.themeName": "Nombre del Tema",
    "regional.panel.logoUrl": "URL del Logo",
    "regional.panel.bannerUrl": "URL del Banner",
    "regional.panel.saveBranding": "Guardar Branding",
    "regional.panel.saving": "Guardando...",
    "regional.panel.brandingSaved": "Branding actualizado con \u00e9xito!",
    "regional.panel.brandingError": "Error al guardar branding",
    "regional.panel.regionSettings": "Configuraci\u00f3n de la Regi\u00f3n",
    "regional.panel.spinWheel": "Rueda de Premios",
    "regional.panel.spinWheelDesc": "Permitir ruleta de premios personalizada",
    "regional.panel.millionaire": "Qui\u00e9n Quiere Ser Millonario?",
    "regional.panel.millionaireDesc": "Juego de preguntas con premios",
    "regional.panel.challengeGames": "Juegos de Desaf\u00edo",
    "regional.panel.challengeGamesDesc": "Desaf\u00edos entre usuarios",
    "regional.panel.liveGames": "Juegos en Vivo",
    "regional.panel.liveGamesDesc": "Lives interactivas con juegos",
    "regional.panel.maintenanceMode": "Modo de Mantenimiento",
    "regional.panel.maintenanceDesc": "Desactivar temporalmente la regi\u00f3n para usuarios",
    "regional.panel.saveSettings": "Guardar Configuraci\u00f3n",
    "regional.panel.settingsSaved": "Configuraci\u00f3n guardada!",
    "regional.panel.settingsError": "Error al guardar configuraci\u00f3n",
    "regional.panel.nativeGamesTitle": "Juegos Nativos de la Regi\u00f3n",
    "regional.panel.nativeGamesDesc": "Crea y gestiona juegos exclusivos para tu regi\u00f3n",
    "regional.panel.createGame": "Crear Juego",
    "regional.panel.gameCreated": "Juego creado! Configura abajo.",
    "regional.panel.gameCreateError": "Error al crear juego",
    "regional.panel.noGames": "Ning\u00fan juego nativo creado a\u00fan.",
    "regional.panel.noGamesHint": "Haz clic en Crear Juego para empezar.",
    "regional.panel.active": "Activo",
    "regional.panel.inactive": "Inactivo",
    "regional.panel.configure": "Configurar",
    "regional.panel.editorDev": "Editor de juego en desarrollo",
    "regional.panel.previewDev": "Vista previa en desarrollo",
    "regional.panel.newGame": "Nuevo Juego {count}",
    "regional.panel.announcementTitle": "Anuncio Regional",
    "regional.panel.announcementActive": "Anuncio activo",
    "regional.panel.announcementActiveDesc": "Mostrar banner de anuncio en la parte superior",
    "regional.panel.announcementText": "Texto del Anuncio",
    "regional.panel.announcementSaved": "Anuncio actualizado!",
    "regional.panel.announcementError": "Error al guardar anuncio",
    "regional.panel.ctaLabel": "Texto del Bot\u00f3n CTA",
    "regional.panel.ctaUrl": "URL del CTA",
    "regional.panel.saveAnnouncement": "Guardar Anuncio",
    "regional.panel.createdOn": "Creado en",
'''

fr_block = '''    "regional.panel.title": "Panneau du Gestionnaire R\u00e9gional",
    "regional.panel.manageIndependently": "G\u00e9rez votre r\u00e9gion de mani\u00e8re ind\u00e9pendante",
    "regional.panel.seniorManager": "Gestionnaire Senior",
    "regional.panel.regionalManager": "Gestionnaire R\u00e9gional",
    "regional.panel.regionCount": "{count} r\u00e9gion(s)",
    "regional.panel.refresh": "Actualiser",
    "regional.panel.branding": "Branding",
    "regional.panel.settings": "Param\u00e8tres",
    "regional.panel.nativeGames": "Jeux Natifs",
    "regional.panel.announcements": "Annonces",
    "regional.panel.visualIdentity": "Identit\u00e9 Visuelle de la R\u00e9gion",
    "regional.panel.primaryColor": "Couleur Primaire",
    "regional.panel.secondaryColor": "Couleur Secondaire",
    "regional.panel.accentColor": "Couleur d Accent",
    "regional.panel.themeName": "Nom du Th\u00e8me",
    "regional.panel.logoUrl": "URL du Logo",
    "regional.panel.bannerUrl": "URL de la Banni\u00e8re",
    "regional.panel.saveBranding": "Sauvegarder le Branding",
    "regional.panel.saving": "Sauvegarde...",
    "regional.panel.brandingSaved": "Branding mis \u00e0 jour avec succ\u00e8s !",
    "regional.panel.brandingError": "Erreur lors de la sauvegarde du branding",
    "regional.panel.regionSettings": "Param\u00e8tres de la R\u00e9gion",
    "regional.panel.spinWheel": "Roue des Prix",
    "regional.panel.spinWheelDesc": "Autoriser la roue des prix personnalis\u00e9e",
    "regional.panel.millionaire": "Qui Veut Gagner des Millions ?",
    "regional.panel.millionaireDesc": "Jeu de quiz avec prix",
    "regional.panel.challengeGames": "Jeux de D\u00e9fi",
    "regional.panel.challengeGamesDesc": "D\u00e9fis entre utilisateurs",
    "regional.panel.liveGames": "Jeux en Direct",
    "regional.panel.liveGamesDesc": "Lives interactives avec jeux",
    "regional.panel.maintenanceMode": "Mode Maintenance",
    "regional.panel.maintenanceDesc": "D\u00e9sactiver temporairement la r\u00e9gion pour les utilisateurs",
    "regional.panel.saveSettings": "Sauvegarder les Param\u00e8tres",
    "regional.panel.settingsSaved": "Param\u00e8tres sauvegard\u00e9s !",
    "regional.panel.settingsError": "Erreur lors de la sauvegarde des param\u00e8tres",
    "regional.panel.nativeGamesTitle": "Jeux Natifs de la R\u00e9gion",
    "regional.panel.nativeGamesDesc": "Cr\u00e9ez et g\u00e9rez des jeux exclusifs pour votre r\u00e9gion",
    "regional.panel.createGame": "Cr\u00e9er un Jeu",
    "regional.panel.gameCreated": "Jeu cr\u00e9\u00e9 ! Configurez ci-dessous.",
    "regional.panel.gameCreateError": "Erreur lors de la cr\u00e9ation du jeu",
    "regional.panel.noGames": "Aucun jeu natif cr\u00e9\u00e9 pour le moment.",
    "regional.panel.noGamesHint": "Cliquez sur Cr\u00e9er un Jeu pour commencer.",
    "regional.panel.active": "Actif",
    "regional.panel.inactive": "Inactif",
    "regional.panel.configure": "Configurer",
    "regional.panel.editorDev": "\u00c9diteur de jeu en d\u00e9veloppement",
    "regional.panel.previewDev": "Aper\u00e7u en d\u00e9veloppement",
    "regional.panel.newGame": "Nouveau Jeu {count}",
    "regional.panel.announcementTitle": "Annonce R\u00e9gionale",
    "regional.panel.announcementActive": "Annonce active",
    "regional.panel.announcementActiveDesc": "Afficher une banni\u00e8re d annonce en haut de page",
    "regional.panel.announcementText": "Texte de l Annonce",
    "regional.panel.announcementSaved": "Annonce mise \u00e0 jour !",
    "regional.panel.announcementError": "Erreur lors de la sauvegarde de l annonce",
    "regional.panel.ctaLabel": "Texte du Bouton CTA",
    "regional.panel.ctaUrl": "URL du CTA",
    "regional.panel.saveAnnouncement": "Sauvegarder l Annonce",
    "regional.panel.createdOn": "Cr\u00e9\u00e9 le",
'''

hi_block = '''    "regional.panel.title": "\u0915\u094d\u0937\u0947\u0924\u094d\u0930\u0940\u092f \u092a\u094d\u0930\u092c\u0902\u0927\u0915 \u092a\u0948\u0928\u0932",
    "regional.panel.manageIndependently": "\u0905\u092a\u0928\u0947 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u093e \u0938\u094d\u0935\u0924\u0902\u0924\u094d\u0930 \u0930\u0942\u092a \u0938\u0947 \u092a\u094d\u0930\u092c\u0902\u0927\u0928 \u0915\u0930\u0947\u0902",
    "regional.panel.seniorManager": "\u0935\u0930\u093f\u0937\u094d\u0920 \u092a\u094d\u0930\u092c\u0902\u0927\u0915",
    "regional.panel.regionalManager": "\u0915\u094d\u0937\u0947\u0924\u094d\u0930\u0940\u092f \u092a\u094d\u0930\u092c\u0902\u0927\u0915",
    "regional.panel.regionCount": "{count} \u0915\u094d\u0937\u0947\u0924\u094d\u0930",
    "regional.panel.refresh": "\u0930\u0940\u092b\u093c\u094d\u0930\u0947\u0936",
    "regional.panel.branding": "\u092c\u094d\u0930\u093e\u0902\u0921\u093f\u0902\u0917",
    "regional.panel.settings": "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938",
    "regional.panel.nativeGames": "\u092e\u0942\u0932 \u0917\u0947\u092e\u094d\u0938",
    "regional.panel.announcements": "\u0918\u094b\u0937\u0923\u093e\u090f\u0901",
    "regional.panel.visualIdentity": "\u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u0940 \u0926\u0943\u0936\u094d\u092f \u092a\u0939\u091a\u093e\u0928",
    "regional.panel.primaryColor": "\u092a\u094d\u0930\u093e\u0925\u092e\u093f\u0915 \u0930\u0902\u0917",
    "regional.panel.secondaryColor": "\u0926\u094d\u0935\u093f\u0924\u0940\u092f\u0915 \u0930\u0902\u0917",
    "regional.panel.accentColor": "\u0905\u0915\u094d\u0938\u0947\u0902\u091f \u0930\u0902\u0917",
    "regional.panel.themeName": "\u0925\u0940\u092e \u0915\u093e \u0928\u093e\u092e",
    "regional.panel.logoUrl": "\u0932\u094b\u0917\u094b URL",
    "regional.panel.bannerUrl": "\u092c\u0948\u0928\u0930 URL",
    "regional.panel.saveBranding": "\u092c\u094d\u0930\u093e\u0902\u0921\u093f\u0902\u0917 \u0938\u0939\u0947\u091c\u0947\u0902",
    "regional.panel.saving": "\u0938\u0939\u0947\u091c \u0930\u0939\u0947 \u0939\u0948\u0902...",
    "regional.panel.brandingSaved": "\u092c\u094d\u0930\u093e\u0902\u0921\u093f\u0902\u0917 \u0938\u092b\u0932\u0924\u093e\u092a\u0942\u0930\u094d\u0935\u0915 \u0905\u092a\u0921\u0947\u091f \u0939\u0941\u0908!",
    "regional.panel.brandingError": "\u092c\u094d\u0930\u093e\u0902\u0921\u093f\u0902\u0917 \u0938\u0939\u0947\u091c\u0928\u0947 \u092e\u0947\u0902 \u0924\u094d\u0930\u0941\u091f\u093f",
    "regional.panel.regionSettings": "\u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938",
    "regional.panel.spinWheel": "\u092a\u0941\u0930\u0938\u094d\u0915\u093e\u0930 \u092a\u0939\u093f\u092f\u093e",
    "regional.panel.spinWheelDesc": "\u0915\u0938\u094d\u091f\u092e \u092a\u0941\u0930\u0938\u094d\u0915\u093e\u0930 \u092a\u0939\u093f\u092f\u093e \u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0926\u0947\u0902",
    "regional.panel.millionaire": "\u0915\u094c\u0928 \u092c\u0928\u0947\u0917\u093e \u0915\u0930\u094b\u0921\u093c\u092a\u0924\u093f",
    "regional.panel.millionaireDesc": "\u092a\u0941र\u0938\u094d\u0915\u093e\u0930\u094b\u0902 \u0915\u0947 \u0938\u093e\u0925 \u0915\u094d\u0935\u093f\u091c\u093c \u0917\u0947\u092e",
    "regional.panel.challengeGames": "\u091a\u0941\u0928\u094c\u0924\u0940 \u0917\u0947\u092e\u094d\u0938",
    "regional.panel.challengeGamesDesc": "\u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e\u0913\u0902 \u0915\u0947 \u092c\u0940\u091a \u091a\u0941\u0928\u094c\u0924\u093f\u092f\u093e\u0901",
    "regional.panel.liveGames": "\u0932\u093e\u0907\u0935 \u0917\u0947\u092e\u094d\u0938",
    "regional.panel.liveGamesDesc": "\u0917\u0947\u092e\u094d\u0938 \u0915\u0947 \u0938\u093e\u0925 \u0907\u0902\u091f\u0930\u0948\u0915\u094d\u091f\u093f\u0935 \u0932\u093e\u0907\u0935",
    "regional.panel.maintenanceMode": "\u0930\u0916\u0930\u0916\u093e\u0935 \u092e\u094b\u0921",
    "regional.panel.maintenanceDesc": "\u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e\u0913\u0902 \u0915\u0947 \u0932\u093f\u090f \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u094b \u0905\u0938\u094d\u0925\u093e\u092f\u0940 \u0930\u0942\u092a \u0938\u0947 \u0905\u0915\u094d\u0937\u092e \u0915\u0930\u0947\u0902",
    "regional.panel.saveSettings": "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u0938\u0939\u0947\u091c\u0947\u0902",
    "regional.panel.settingsSaved": "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u0938\u0939\u0947\u091c\u0940 \u0917\u0908!",
    "regional.panel.settingsError": "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u0938\u0939\u0947\u091c\u0928\u0947 \u092e\u0947\u0902 \u0924\u094d\u0930\u0941\u091f\u093f",
    "regional.panel.nativeGamesTitle": "\u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u0947 \u092e\u0942\u0932 \u0917\u0947\u092e\u094d\u0938",
    "regional.panel.nativeGamesDesc": "\u0905\u092a\u0928\u0947 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u0947 \u0932\u093f\u090f \u0905\u0928\u0928\u094d\u092f \u0917\u0947\u092e\u094d\u0938 \u092c\u0928\u093e\u090f\u0902 \u0914\u0930 \u092a\u094d\u0930\u092c\u0902\u0927\u093f\u0924 \u0915\u0930\u0947\u0902",
    "regional.panel.createGame": "\u0917\u0947\u092e \u092c\u0928\u093e\u090f\u0902",
    "regional.panel.gameCreated": "\u0917\u0947\u092e \u092c\u0928\u093e\u092f\u093e \u0917\u092f\u093e! \u0928\u0940\u091a\u0947 \u0915\u0949\u0928\u094d\u092b\u093c\u093f\u0917\u0930 \u0915\u0930\u0947\u0902\u0964",
    "regional.panel.gameCreateError": "\u0917\u0947\u092e \u092c\u0928\u093e\u0928\u0947 \u092e\u0947\u0902 \u0924\u094d\u0930\u0941\u091f\u093f",
    "regional.panel.noGames": "\u0905\u092d\u0940 \u0924\u0915 \u0915\u094b\u0908 \u092e\u0942\u0932 \u0917\u0947\u092e \u0928\u0939\u0940\u0902 \u092c\u0928\u093e\u092f\u093e \u0917\u092f\u093e\u0964",
    "regional.panel.noGamesHint": "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0917\u0947\u092e \u092c\u0928\u093e\u090f\u0902 \u092a\u0930 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0947\u0902\u0964",
    "regional.panel.active": "\u0938\u0915\u094d\u0930\u093f\u092f",
    "regional.panel.inactive": "\u0928\u093f\u0937\u094d\u0915\u094d\u0930\u093f\u092f",
    "regional.panel.configure": "\u0915\u0949\u0928\u094d\u092b\u093c\u093f\u0917\u0930 \u0915\u0930\u0947\u0902",
    "regional.panel.editorDev": "\u0917\u0947\u092e \u090f\u0921\u093f\u091f\u0930 \u0935\u093f\u0915\u093e\u0938 \u092e\u0947\u0902 \u0939\u0948",
    "regional.panel.previewDev": "\u092a\u0942\u0930\u094d\u0935\u093e\u0935\u0932\u094b\u0915\u0928 \u0935\u093f\u0915\u093e\u0938 \u092e\u0947\u0902 \u0939\u0948",
    "regional.panel.newGame": "\u0928\u092f\u093e \u0917\u0947\u092e {count}",
    "regional.panel.announcementTitle": "\u0915\u094d\u0937\u0947\u0924\u094d\u0930\u0940\u092f \u0918\u094b\u0937\u0923\u093e",
    "regional.panel.announcementActive": "\u0938\u0915\u094d\u0930\u093f\u092f \u0918\u094b\u0937\u0923\u093e",
    "regional.panel.announcementActiveDesc": "\u092a\u0943\u0937\u094d\u0920 \u0915\u0947 \u0936\u0940\u0930\u094d\u0937 \u092a\u0930 \u0918\u094b\u0937\u0923\u093e \u092c\u0948\u0928\u0930 \u0926\u093f\u0916\u093e\u090f\u0902",
    "regional.panel.announcementText": "\u0918\u094b\u0937\u0923\u093e \u092a\u093e\u0920",
    "regional.panel.announcementSaved": "\u0918\u094b\u0937\u0923\u093e \u0905\u092a\u0921\u0947\u091f \u0939\u0941\u0908!",
    "regional.panel.announcementError": "\u0918\u094b\u0937\u0923\u093e \u0938\u0939\u0947\u091c\u0928\u0947 \u092e\u0947\u0902 \u0924\u094d\u0930\u0941\u091f\u093f",
    "regional.panel.ctaLabel": "CTA \u092c\u091f\u0928 \u092a\u093e\u0920",
    "regional.panel.ctaUrl": "CTA URL",
    "regional.panel.saveAnnouncement": "\u0918\u094b\u0937\u0923\u093e \u0938\u0939\u0947\u091c\u0947\u0902",
    "regional.panel.createdOn": "\u092c\u0928\u093e\u092f\u093e \u0917\u092f\u093e",
'''

# PT-BR: insert before the error.* keys in pt-BR block
ptbr_anchor = '    "error.somethingWrong": "Algo deu errado",'
if ptbr_anchor in content:
    content = content.replace(ptbr_anchor, ptbr_block.rstrip() + '\n\n' + ptbr_anchor)
    print("PT-BR: Inserted 86 regional keys")
else:
    print("PT-BR: Anchor not found!")

# ES: insert after regional.language key in ES block (2nd occurrence)
es_anchor = '    "regional.language": "Idioma",'
es_count = content.count(es_anchor)
if es_count >= 2:
    parts = content.split(es_anchor)
    if len(parts) >= 3:
        content = parts[0] + es_anchor + '\n' + es_block.rstrip() + parts[1] + es_anchor.join(parts[2:])
        print(f"ES: Inserted 58 regional.panel keys (anchor {es_count}x)")
    else:
        print("ES: Not enough parts")
else:
    print(f"ES: Anchor found {es_count}x, need >= 2")

# FR: insert after regional.language in FR block
fr_anchor = '    "regional.language": "Langue",'
fr_count = content.count(fr_anchor)
if fr_count >= 1:
    content = content.replace(fr_anchor, fr_anchor + '\n' + fr_block.rstrip())
    print(f"FR: Inserted 58 regional.panel keys (anchor {fr_count}x)")
else:
    print(f"FR: Anchor not found!")

# HI: insert after regional.language in HI block
hi_anchor = '    "regional.language": "\u092d\u093e\u0937\u093e",'
hi_count = content.count(hi_anchor)
if hi_count >= 1:
    content = content.replace(hi_anchor, hi_anchor + '\n' + hi_block.rstrip())
    print(f"HI: Inserted 58 regional.panel keys (anchor {hi_count}x)")
else:
    print(f"HI: Anchor not found!")

with open(FILE, 'w') as f:
    f.write(content)

print("\nDone! Verifying...")

# Verify
with open(FILE, 'r') as f:
    content = f.read()

import re as re2
langs = ['en', 'pt', 'pt-BR', 'es', 'fr', 'hi']
keys_by_lang = {l: set() for l in langs}
lines = content.split('\n')
current_lang = None

for line in lines:
    for lang in langs:
        if f'{lang}: {{' in line or f'{lang}:{{' in line:
            current_lang = lang
            break
    if current_lang and 'regional.' in line and '"' in line:
        key_match = re2.search(r'"(regional\.[^"]+)"', line)
        if key_match:
            keys_by_lang[current_lang].add(key_match.group(1))

en_keys = keys_by_lang['en']
print(f'\nVerification:')
print(f'EN regional keys: {len(en_keys)}')
for lang in langs[1:]:
    missing = en_keys - keys_by_lang[lang]
    print(f'{lang}: {len(keys_by_lang[lang])} keys, missing {len(missing)}')
    if missing:
        for k in sorted(missing)[:5]:
            print(f'  - {k}')
        if len(missing) > 5:
            print(f'  ... and {len(missing)-5} more')
