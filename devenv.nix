{ pkgs, lib, config, inputs, ... }:

{
  dotenv.enable = true;

  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    nodejs
    pnpm
  ];

  # https://devenv.sh/services/
  services.mongodb.enable = true;
  tasks."mongodb:restore" = {
    exec = ''mongorestore --drop'';
  };
  #tasks."mongodb:dump" = {
  #  exec = ''mongodump'';
  #  after = [ "devenv:processes:mongodb" ];
  #};

  # https://devenv.sh/tests/

  # https://devenv.sh/git-hooks/
  # git-hooks.hooks.shellcheck.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
